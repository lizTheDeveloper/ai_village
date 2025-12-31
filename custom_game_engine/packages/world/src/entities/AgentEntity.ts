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
  NeedsComponent,
  MemoryComponent,
  PersonalityComponent,
  createVisionComponent,
  createConversationComponent,
  createRelationshipComponent,
  createInventoryComponent,
  calculateInventoryWeight,
  createTemperatureComponent,
  createCircadianComponent,
  generateRandomName,
  createIdentityComponent,
  createGatheringStatsComponent,
  generateRandomStartingSkills,
  createGoalsComponent,
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
  createSpiritualComponent,
  // Conflict system components
  createCombatStatsComponent,
  createDominanceRankComponent,
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

  // Personality - random personality traits (0-1 scale)
  const randomTrait = () => Math.random();
  entity.addComponent(
    new PersonalityComponent({
      openness: randomTrait(),
      conscientiousness: randomTrait(),
      extraversion: randomTrait(),
      agreeableness: randomTrait(),
      neuroticism: randomTrait(),
    })
  );

  // Agent behavior - start idle, will wander when bored
  // with staggered think offset to prevent thundering herd
  const thinkInterval = 20;
  const thinkOffset = generateThinkOffset(entity.id, thinkInterval * 2);
  entity.addComponent(createAgentComponent('idle', thinkInterval, false, thinkOffset));

  // Movement
  entity.addComponent(createMovementComponent(speed, 0, 0));

  // Needs - hunger, energy, health, decay rates
  // Note: Values are 0-1 scale (1 = full/healthy, 0 = empty/critical)
  // Energy depletion is now handled by NeedsSystem based on activity level and game time
  // Hunger decay rate: 0.0042 per second at 1x speed (48s/day)
  entity.addComponent(
    new NeedsComponent({
      hunger: 1.0, // start full
      energy: 0.8, // start at 80% - well-rested but not max
      health: 1.0, // start healthy
      thirst: 1.0,
      hungerDecayRate: 0.0042, // 0.42/100 converted to 0-1 scale
      energyDecayRate: 0.005, // 0.5/100 converted to 0-1 scale
    })
  );

  // Memory - episodic/semantic/procedural memory
  entity.addComponent(new MemoryComponent(entity.id));

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
  // Recalculate weight after adding items directly to slots
  inventory.currentWeight = calculateInventoryWeight(inventory);
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
  entity.addComponent(createSteeringComponent('none', speed, speed * 2));
  entity.addComponent(createVelocityComponent(0, 0));

  // Gathering stats - track what the agent has gathered and deposited
  entity.addComponent(createGatheringStatsComponent());

  // Skills - personality-based starting skills for role diversity
  const personalityWander = entity.getComponent('personality') as any;
  const skillsComponent = generateRandomStartingSkills(personalityWander);
  entity.addComponent(skillsComponent);

  // Spiritual component - faith and divine connection based on personality
  const spiritualityTrait = personalityWander?.spirituality ?? 0.5;
  entity.addComponent(createSpiritualComponent(spiritualityTrait));

  // Personal Goals - track agent's aspirations and progress
  entity.addComponent(createGoalsComponent());

  // Combat stats - copy skills from SkillsComponent to CombatStatsComponent
  // Note: CombatStatsComponent tracks combat-specific skills for backwards compatibility
  // but SkillsComponent is the source of truth
  entity.addComponent(createCombatStatsComponent({
    combatSkill: (skillsComponent.levels.combat || 0) / 5, // Convert level (0-5) to 0-1 scale
    huntingSkill: (skillsComponent.levels.hunting || 0) / 5, // Convert level (0-5) to 0-1 scale
    stealthSkill: (skillsComponent.levels.stealth || 0) / 5, // Convert level (0-5) to 0-1 scale
  }));

  // Injury tracking - starts with no injuries (using empty component object)
  entity.addComponent({
    type: 'injury',
    version: 1,
    injuryType: 'laceration', // Required by interface but unused when injuries array is empty
    severity: 'minor',
    location: 'torso',
    injuries: [], // Empty array = no injuries
    skillPenalties: {},
    elapsed: 0,
    treated: false,
    untreatedDuration: 0,
  } as any); // Cast needed because interface requires fields even when using injuries array

  // Guard duty - not assigned initially (using minimal object)
  entity.addComponent({
    type: 'guard_duty',
    version: 1,
    assignmentType: 'location' as const, // Required by interface but unused when no assignment
    targetLocation: undefined,
    targetPerson: undefined,
    patrolRoute: undefined,
    patrolIndex: 0,
    alertness: 1.0,
    responseRadius: 10,
    lastCheckTime: 0,
  } as any); // Cast needed for optional fields

  // Dominance rank - neutral rank for non-hierarchical species
  entity.addComponent(createDominanceRankComponent({
    rank: 0, // 0 = no rank in hierarchy
    subordinates: [],
    canChallengeAbove: false, // Not a dominance-based species
  }));

  // Add to world
  (world as any)._addEntity(entity);

  // Emit agent:birth event for metrics tracking
  const identity = entity.getComponent('identity') as { name: string } | undefined;
  const needs = entity.getComponent('needs') as { health: number; hunger: number; energy: number } | undefined;
  world.eventBus.emit({
    type: 'agent:birth',
    source: entity.id,
    data: {
      agentId: entity.id,
      name: identity?.name ?? 'Unknown',
      useLLM: false,
      generation: 0,
      parents: null,
      initialStats: {
        health: needs?.health ?? 100,
        hunger: needs?.hunger ?? 100,
        energy: needs?.energy ?? 80,
      },
    },
  });

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

  // Personality - random personality traits (TODO: create personality generation)
  entity.addComponent(new PersonalityComponent({
    openness: Math.random(),
    conscientiousness: Math.random(),
    extraversion: Math.random(),
    agreeableness: Math.random(),
    neuroticism: Math.random(),
  }));

  // Agent behavior - LLM-controlled, start idle, will wander when bored
  // with staggered think offset to prevent thundering herd
  const thinkInterval = 20;
  const thinkOffset = generateThinkOffset(entity.id, thinkInterval * 2);
  entity.addComponent(createAgentComponent('idle', thinkInterval, true, thinkOffset)); // useLLM = true

  // Movement
  entity.addComponent(createMovementComponent(speed, 0, 0));

  // Needs - hunger, energy, health, decay rates
  // Note: Energy depletion is now handled by NeedsSystem based on activity level and game time
  // Hunger decay rate: 0.42 points/second at 1x speed (48s/day) = once per game day eating (50→30 in 48s)
  entity.addComponent(new NeedsComponent({
    hunger: 1.0,      // hunger (start full) - 0-1 scale
    energy: 0.8,      // energy (start at 80 - well-rested but not max) - 0-1 scale
    health: 1.0,      // health (start healthy) - 0-1 scale
    hungerDecayRate: 0.0042,  // hungerDecayRate (0.42/100 for 0-1 scale)
    energyDecayRate: 0.005,   // energyDecayRate (0.5/100 for 0-1 scale)
  }));

  // Memory - remember up to 20 things
  entity.addComponent(new MemoryComponent(entity.id));

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
  // Recalculate weight after adding items directly to slots
  inventory.currentWeight = calculateInventoryWeight(inventory);
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
  entity.addComponent(createSteeringComponent('none', speed, speed * 2));
  entity.addComponent(createVelocityComponent(0, 0));

  // Gathering stats - track what the agent has gathered and deposited
  entity.addComponent(createGatheringStatsComponent());

  // Skills - personality-based starting skills for role diversity
  const personalityLLM = entity.getComponent('personality') as any;
  const skillsComponentLLM = generateRandomStartingSkills(personalityLLM);
  entity.addComponent(skillsComponentLLM);

  // Spiritual component - faith and divine connection based on personality
  const spiritualityTrait = personalityLLM?.spirituality ?? 0.5;
  entity.addComponent(createSpiritualComponent(spiritualityTrait));

  // Personal Goals - track agent's aspirations and progress
  entity.addComponent(createGoalsComponent());

  // Combat stats - copy skills from SkillsComponent to CombatStatsComponent
  // Note: CombatStatsComponent tracks combat-specific skills for backwards compatibility
  // but SkillsComponent is the source of truth
  entity.addComponent(createCombatStatsComponent({
    combatSkill: (skillsComponentLLM.levels.combat || 0) / 5, // Convert level (0-5) to 0-1 scale
    huntingSkill: (skillsComponentLLM.levels.hunting || 0) / 5, // Convert level (0-5) to 0-1 scale
    stealthSkill: (skillsComponentLLM.levels.stealth || 0) / 5, // Convert level (0-5) to 0-1 scale
  }));

  // Injury tracking - starts with no injuries (using empty component object)
  entity.addComponent({
    type: 'injury',
    version: 1,
    injuryType: 'laceration', // Required by interface but unused when injuries array is empty
    severity: 'minor',
    location: 'torso',
    injuries: [], // Empty array = no injuries
    skillPenalties: {},
    elapsed: 0,
    treated: false,
    untreatedDuration: 0,
  } as any); // Cast needed because interface requires fields even when using injuries array

  // Guard duty - not assigned initially (using minimal object)
  entity.addComponent({
    type: 'guard_duty',
    version: 1,
    assignmentType: 'location' as const, // Required by interface but unused when no assignment
    targetLocation: undefined,
    targetPerson: undefined,
    patrolRoute: undefined,
    patrolIndex: 0,
    alertness: 1.0,
    responseRadius: 10,
    lastCheckTime: 0,
  } as any); // Cast needed for optional fields

  // Dominance rank - neutral rank for non-hierarchical species
  entity.addComponent(createDominanceRankComponent({
    rank: 0, // 0 = no rank in hierarchy
    subordinates: [],
    canChallengeAbove: false, // Not a dominance-based species
  }));

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

  // Emit agent:birth event for metrics tracking
  const identity = entity.getComponent('identity') as { name: string } | undefined;
  const needs = entity.getComponent('needs') as { health: number; hunger: number; energy: number } | undefined;
  world.eventBus.emit({
    type: 'agent:birth',
    source: entity.id,
    data: {
      agentId: entity.id,
      name: identity?.name ?? 'Unknown',
      useLLM: true,
      generation: 0,
      parents: null,
      initialStats: {
        health: needs?.health ?? 100,
        hunger: needs?.hunger ?? 100,
        energy: needs?.energy ?? 80,
      },
    },
  });

  return entity.id;
}
