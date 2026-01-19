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
  createVisionForProfile,
  type SkillsComponent,
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
  derivePrioritiesFromSkills,
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
  // Appearance for sprite selection
  createAppearanceComponent,
  createSpiritualComponent,
  // Conflict system components
  createCombatStatsComponent,
  createDominanceRankComponent,
  type InjuryComponent,
  type GuardDutyComponent,
  // Realm system components
  createRealmLocationComponent,
  SpeciesComponent,
  createParentingComponent,
} from '@ai-village/core';
// Reproduction system components
import {
  createSexualityComponent,
  ensureCourtshipComponent,
} from '@ai-village/reproduction';

/**
 * Internal interface for accessing World's _addEntity method.
 * This is used for proper spatial indexing when adding entities.
 */
interface WorldInternal extends WorldMutator {
  _addEntity(entity: EntityImpl): void;
}

/**
 * Determine the best vision profile based on agent skills.
 * Higher skill levels in relevant categories determine the profile.
 */
function getVisionProfileFromSkills(
  skills: SkillsComponent
): 'default' | 'scout' | 'farmer' | 'guard' | 'crafter' {
  const levels = skills.levels;

  // Find the highest relevant skill
  const profileScores = {
    scout: (levels.exploration ?? 0) + (levels.hunting ?? 0) * 0.5,
    farmer: (levels.farming ?? 0) + (levels.gathering ?? 0) * 0.5,
    guard: (levels.combat ?? 0) + (levels.stealth ?? 0) * 0.5,
    crafter: (levels.crafting ?? 0) + (levels.building ?? 0) * 0.5,
  };

  // Find the profile with the highest score
  let bestProfile: keyof typeof profileScores = 'scout';
  let bestScore = profileScores.scout;

  for (const [profile, score] of Object.entries(profileScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestProfile = profile as keyof typeof profileScores;
    }
  }

  // Only use specialized profile if score is at least 2 (one skill at level 2+)
  if (bestScore >= 2) {
    return bestProfile;
  }

  return 'default';
}

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
  speed: number = 2.0,
  options?: { believedDeity?: string }
): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  // Position
  entity.addComponent(createPositionComponent(x, y));

  // Physics - agents are not solid (can pass through each other)
  entity.addComponent(createPhysicsComponent(false, 1, 1));

  // Renderable
  entity.addComponent(createRenderableComponent('agent', 'entity'));

  // Appearance - random visual traits for PixelLab sprite selection
  entity.addComponent(createAppearanceComponent());

  // Tags
  entity.addComponent(createTagsComponent('agent', 'wanderer'));

  // Identity - give agent a name
  entity.addComponent(createIdentityComponent(generateRandomName()));

  // Personality - random personality traits (0-1 scale)
  const randomTrait = () => Math.random();
  const personality = new PersonalityComponent({
    openness: randomTrait(),
    conscientiousness: randomTrait(),
    extraversion: randomTrait(),
    agreeableness: randomTrait(),
    neuroticism: randomTrait(),
  });
  entity.addComponent(personality);

  // Skills - personality-based starting skills for role diversity
  // Created early so we can derive priorities from them
  const skillsComponent = generateRandomStartingSkills(personality);
  entity.addComponent(skillsComponent);

  // Agent behavior - start idle, will wander when bored
  // Priorities are derived from skills so agents naturally prefer activities they're skilled in
  const thinkInterval = 20;
  const thinkOffset = generateThinkOffset(entity.id, thinkInterval * 2);
  const priorities = derivePrioritiesFromSkills(skillsComponent);
  entity.addComponent(createAgentComponent('idle', thinkInterval, false, thinkOffset, priorities));

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

  // Vision - tiered awareness based on skill profile
  // Scouts/hunters see farther, farmers focus nearby, guards have broad awareness
  const visionProfile = getVisionProfileFromSkills(skillsComponent);
  entity.addComponent(createVisionForProfile(visionProfile));

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

  // Spiritual component - faith and divine connection based on personality
  const spiritualityTrait = personality.spirituality;
  entity.addComponent(createSpiritualComponent(spiritualityTrait, options?.believedDeity));

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
  const initialInjury: InjuryComponent = {
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
  };
  entity.addComponent(initialInjury);

  // Guard duty - not assigned initially (using minimal object)
  const initialGuardDuty: GuardDutyComponent = {
    type: 'guard_duty',
    version: 1,
    assignmentType: 'location', // Required by interface but unused when no assignment
    targetLocation: undefined,
    targetPerson: undefined,
    patrolRoute: undefined,
    patrolIndex: 0,
    alertness: 1.0,
    responseRadius: 10,
    lastCheckTime: 0,
  };
  entity.addComponent(initialGuardDuty);

  // Dominance rank - neutral rank for non-hierarchical species
  entity.addComponent(createDominanceRankComponent({
    rank: 0, // 0 = no rank in hierarchy
    subordinates: [],
    canChallengeAbove: false, // Not a dominance-based species
  }));

  // Realm location - agents start in the mortal world
  entity.addComponent(createRealmLocationComponent('mortal_world'));

  // Reproduction - sexuality and parenting components
  // Default to human paradigm (can be customized per species later)
  const sexuality = createSexualityComponent({
    relationshipStyle: 'monogamous', // Default for humans
  });
  const isActivelySeeking = Math.random() > 0.3; // 70% chance of being open to romance
  sexuality.activelySeeking = isActivelySeeking;
  entity.addComponent(sexuality);

  // Lazily add courtship component only if actively seeking
  if (isActivelySeeking) {
    ensureCourtshipComponent(entity, 'human');
  }

  entity.addComponent(createParentingComponent('both_parents')); // Human parental care

  // Species - all agents default to human species
  entity.addComponent(new SpeciesComponent('human', 'Human', 'humanoid_biped'));

  // Add to world - using internal _addEntity method for proper spatial indexing
  (world as WorldInternal)._addEntity(entity);

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
  dungeonMasterPrompt?: string,
  options?: { believedDeity?: string }
): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  // Position
  entity.addComponent(createPositionComponent(x, y));

  // Physics - agents are not solid (can pass through each other)
  entity.addComponent(createPhysicsComponent(false, 1, 1));

  // Renderable
  entity.addComponent(createRenderableComponent('agent', 'entity'));

  // Appearance - random visual traits for PixelLab sprite selection
  entity.addComponent(createAppearanceComponent());

  // Tags
  entity.addComponent(createTagsComponent('agent', 'llm_agent'));

  // Identity - give agent a name
  entity.addComponent(createIdentityComponent(generateRandomName()));

  // Personality - random personality traits
  const personalityLLM = new PersonalityComponent({
    openness: Math.random(),
    conscientiousness: Math.random(),
    extraversion: Math.random(),
    agreeableness: Math.random(),
    neuroticism: Math.random(),
  });
  entity.addComponent(personalityLLM);

  // Skills - personality-based starting skills for role diversity
  // Created early so we can derive priorities from them
  const skillsComponentLLM = generateRandomStartingSkills(personalityLLM);
  entity.addComponent(skillsComponentLLM);

  // Agent behavior - LLM-controlled, start idle, will wander when bored
  // Priorities are derived from skills so agents naturally prefer activities they're skilled in
  const thinkInterval = 20;
  const thinkOffset = generateThinkOffset(entity.id, thinkInterval * 2);
  const prioritiesLLM = derivePrioritiesFromSkills(skillsComponentLLM);
  entity.addComponent(createAgentComponent('idle', thinkInterval, true, thinkOffset, prioritiesLLM)); // useLLM = true

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

  // Vision - tiered awareness based on skill profile
  // Scouts/hunters see farther, farmers focus nearby, guards have broad awareness
  const visionProfileLLM = getVisionProfileFromSkills(skillsComponentLLM);
  entity.addComponent(createVisionForProfile(visionProfileLLM));

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

  // Spiritual component - faith and divine connection based on personality
  const spiritualityTrait = personalityLLM.spirituality;
  entity.addComponent(createSpiritualComponent(spiritualityTrait, options?.believedDeity));

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
  const initialInjuryLLM: InjuryComponent = {
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
  };
  entity.addComponent(initialInjuryLLM);

  // Guard duty - not assigned initially (using minimal object)
  const initialGuardDutyLLM: GuardDutyComponent = {
    type: 'guard_duty',
    version: 1,
    assignmentType: 'location', // Required by interface but unused when no assignment
    targetLocation: undefined,
    targetPerson: undefined,
    patrolRoute: undefined,
    patrolIndex: 0,
    alertness: 1.0,
    responseRadius: 10,
    lastCheckTime: 0,
  };
  entity.addComponent(initialGuardDutyLLM);

  // Dominance rank - neutral rank for non-hierarchical species
  entity.addComponent(createDominanceRankComponent({
    rank: 0, // 0 = no rank in hierarchy
    subordinates: [],
    canChallengeAbove: false, // Not a dominance-based species
  }));

  // Realm location - agents start in the mortal world
  entity.addComponent(createRealmLocationComponent('mortal_world'));

  // Reproduction - sexuality and parenting components
  // Default to human paradigm (can be customized per species later)
  const sexuality2 = createSexualityComponent({
    relationshipStyle: 'monogamous', // Default for humans
  });
  const isActivelySeeking2 = Math.random() > 0.3; // 70% chance of being open to romance
  sexuality2.activelySeeking = isActivelySeeking2;
  entity.addComponent(sexuality2);

  // Lazily add courtship component only if actively seeking
  if (isActivelySeeking2) {
    ensureCourtshipComponent(entity, 'human');
  }

  entity.addComponent(createParentingComponent('both_parents')); // Human parental care

  // Species - all agents default to human species
  entity.addComponent(new SpeciesComponent('human', 'Human', 'humanoid_biped'));

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

  // Add to world - using internal _addEntity method for proper spatial indexing
  (world as WorldInternal)._addEntity(entity);

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
