/**
 * ReincarnationSystem - Processes queued reincarnation and spawns new entities
 *
 * Listens for 'soul:reincarnation_queued' events and:
 * 1. Queues souls with their delay timers
 * 2. When delay expires, spawns a new entity
 * 3. Transfers memories/skills based on retention config
 * 4. Handles species constraints
 * 5. Emits 'soul:reincarnated' when complete
 *
 * Policy configurations:
 * - target: same_world, same_universe, any_universe, specific
 * - memoryRetention: full, fragments, dreams, talents, none
 * - speciesConstraint: same, similar, any, karmic
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId } from '../types.js';
import type { World, WorldMutator } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { createEntityId } from '../ecs/Entity.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { SkillsComponent, SkillId } from '../components/SkillsComponent.js';
import type { EpisodicMemoryComponent, EpisodicMemory } from '../components/EpisodicMemoryComponent.js';
import type { PersonalityComponent } from '../components/PersonalityComponent.js';
import type { DeedLedgerComponent } from '../components/DeedLedgerComponent.js';
import type { SpeciesComponent } from '../components/SpeciesComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { ReincarnationConfig, MemoryRetention, SpeciesConstraint } from '../divinity/AfterlifePolicy.js';
import { NeedsComponent } from '../components/NeedsComponent.js';
import { MemoryComponent } from '../components/MemoryComponent.js';
import { PersonalityComponent as PersonalityComponentClass } from '../components/PersonalityComponent.js';
import {
  createPositionComponent,
  createPhysicsComponent,
  createRenderableComponent,
  createTagsComponent,
  createIdentityComponent,
  generateRandomName,
  createAgentComponent,
  createMovementComponent,
  createVisionForProfile,
  createRelationshipComponent,
  createInventoryComponent,
  createTemperatureComponent,
  createCircadianComponent,
  createSteeringComponent,
  createVelocityComponent,
  createGatheringStatsComponent,
  createSpiritualComponent,
  createGoalsComponent,
  createCombatStatsComponent,
  createRealmLocationComponent,
  createInjuryComponent,
} from '../components/index.js';
import { EpisodicMemoryComponent as EpisodicMemoryComponentClass } from '../components/EpisodicMemoryComponent.js';
import { SemanticMemoryComponent } from '../components/SemanticMemoryComponent.js';
import { SocialMemoryComponent } from '../components/SocialMemoryComponent.js';
import { ReflectionComponent } from '../components/ReflectionComponent.js';
import { createCurrentLifeMemory } from '../components/CurrentLifeMemoryComponent.js';
import { createVeilOfForgetting } from '../components/VeilOfForgettingComponent.js';
import { JournalComponent } from '../components/JournalComponent.js';
import { SpatialMemoryComponent } from '../components/SpatialMemoryComponent.js';
import { TrustNetworkComponent } from '../components/TrustNetworkComponent.js';
import { BeliefComponent } from '../components/BeliefComponent.js';
import { SocialGradientComponent } from '../components/SocialGradientComponent.js';
import { ExplorationStateComponent } from '../components/ExplorationStateComponent.js';
import { generateRandomStartingSkills } from '../components/SkillsComponent.js';
import { calculateDeedScore } from '../components/DeedLedgerComponent.js';
import type { ReincarnationTarget } from '../divinity/AfterlifePolicy.js';
import { createAfterlifeMemoryComponent } from '../components/AfterlifeMemoryComponent.js';
import type { SoulWisdomComponent } from '../components/SoulWisdomComponent.js';
import {
  createSoulWisdomComponent,
  createReincarnatedSoulWisdomComponent,
} from '../components/SoulWisdomComponent.js';
import type { SoulIdentityComponent } from '../components/SoulIdentityComponent.js';
import { addIncarnationRecord } from '../components/SoulIdentityComponent.js';
import { getSpeciesTemplate, createSpeciesFromTemplate } from '../species/SpeciesRegistry.js';

/** Event data for soul:reincarnation_queued */
interface ReincarnationQueuedEventData {
  entityId: string;
  deityId?: string;
  target: ReincarnationTarget;
  memoryRetention: MemoryRetention;
  speciesConstraint: SpeciesConstraint;
  minimumDelay: number;
  maximumDelay: number;
}

/** A soul waiting to be reincarnated */
interface QueuedSoul {
  /** Original entity ID */
  originalEntityId: string;

  /** Deity that ordered the reincarnation */
  deityId?: string;

  /** Reincarnation configuration */
  config: ReincarnationConfig;

  /** Tick when reincarnation was queued */
  queuedAt: number;

  /** Tick when reincarnation should occur */
  rebirthAt: number;

  /** Preserved data from the original entity */
  preserved: {
    name?: string;
    personality?: PersonalityComponent;
    skills?: SkillsComponent;
    memories?: EpisodicMemory[];
    suppressedMemories?: EpisodicMemory[]; // Accumulated across reincarnations for wisdom
    soulWisdom?: SoulWisdomComponent; // Soul wisdom tracker (path to godhood)
    soulIdentity?: SoulIdentityComponent; // ALWAYS preserved - soul's true name and history
    species?: string;
    deedScore?: number;
    deathLocation?: { x: number; y: number };
  };
}

/**
 * Determine the best vision profile based on agent skills.
 */
function getVisionProfileFromSkills(
  skills: SkillsComponent
): 'default' | 'scout' | 'farmer' | 'guard' | 'crafter' {
  const levels = skills.levels;
  const profileScores = {
    scout: (levels.exploration ?? 0) + (levels.hunting ?? 0) * 0.5,
    farmer: (levels.farming ?? 0) + (levels.gathering ?? 0) * 0.5,
    guard: (levels.combat ?? 0) + (levels.stealth ?? 0) * 0.5,
    crafter: (levels.crafting ?? 0) + (levels.building ?? 0) * 0.5,
  };

  let bestProfile: keyof typeof profileScores = 'scout';
  let bestScore = profileScores.scout;

  for (const [profile, score] of Object.entries(profileScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestProfile = profile as keyof typeof profileScores;
    }
  }

  return bestScore >= 2 ? bestProfile : 'default';
}

/** Species categories for 'similar' constraint */
const SPECIES_CATEGORIES: Record<string, string[]> = {
  humanoid: ['human', 'elf', 'dwarf', 'orc', 'goblin'],
  beast: ['wolf', 'bear', 'deer', 'rabbit', 'boar'],
  bird: ['crow', 'eagle', 'owl', 'sparrow'],
  aquatic: ['fish', 'frog', 'turtle'],
  insect: ['bee', 'ant', 'beetle', 'butterfly'],
};

/**
 * ReincarnationSystem - Handles the rebirth of souls per deity policy
 */
export class ReincarnationSystem extends BaseSystem {
  readonly id: SystemId = 'reincarnation';
  readonly priority: number = 120; // Run after DeathTransitionSystem
  readonly requiredComponents = [] as const;
  // Lazy activation: Skip entire system when no reincarnation exists
  public readonly activationComponents = ['reincarnation'] as const;
  protected readonly throttleInterval = 200; // VERY_SLOW - 10 seconds // Event-driven, doesn't need entity iteration

  private queuedSouls: Map<string, QueuedSoul> = new Map();

  /**
   * Initialize event listener
   */
  protected onInitialize(world: World): void {
    world.eventBus.subscribe(
      'soul:reincarnation_queued',
      (event) => this.handleReincarnationQueued(world, event)
    );
  }

  /**
   * Handle incoming reincarnation queued events
   */
  private handleReincarnationQueued(
    world: World,
    event: { type: 'soul:reincarnation_queued'; source: string; data: ReincarnationQueuedEventData }
  ): void {
    const { entityId, deityId, target, memoryRetention, speciesConstraint, minimumDelay, maximumDelay } = event.data;

    // Get original entity to preserve data
    const entity = world.getEntity(entityId);
    if (!entity) return;

    // Calculate rebirth delay
    const delay = minimumDelay + Math.random() * (maximumDelay - minimumDelay);
    const currentTick = world.tick;

    // Preserve relevant data based on memory retention
    const preserved = this.preserveEntityData(entity, memoryRetention, speciesConstraint, currentTick);

    // Create reincarnation config from event data
    const config: ReincarnationConfig = {
      target,
      memoryRetention,
      speciesConstraint,
      minimumDelay,
      maximumDelay,
      canRefuse: false, // Default - could be extended
    };

    const queuedSoul: QueuedSoul = {
      originalEntityId: entityId,
      deityId,
      config,
      queuedAt: currentTick,
      rebirthAt: currentTick + delay,
      preserved,
    };

    this.queuedSouls.set(entityId, queuedSoul);
  }

  /**
   * Preserve entity data based on retention policy
   */
  private preserveEntityData(
    entity: Entity,
    memoryRetention: MemoryRetention,
    speciesConstraint: SpeciesConstraint,
    currentTick: number
  ): QueuedSoul['preserved'] {
    const preserved: QueuedSoul['preserved'] = {};

    // Always preserve death location for spawn point
    const position = entity.getComponent<PositionComponent>('position');
    if (position) {
      preserved.deathLocation = { x: position.x, y: position.y };
    }

    // Preserve species for same/similar constraints
    if (speciesConstraint === 'same' || speciesConstraint === 'similar') {
      const species = entity.getComponent<SpeciesComponent>('species');
      preserved.species = species?.speciesId ?? 'human';
    }

    // Calculate deed score for karmic constraint
    if (speciesConstraint === 'karmic') {
      const ledger = entity.getComponent<DeedLedgerComponent>('deed_ledger');
      if (ledger) {
        // Use empty weights for simple sum of all deeds
        preserved.deedScore = calculateDeedScore(ledger, [], false);
      }
    }

    // Preserve identity
    const identity = entity.getComponent<IdentityComponent>('identity');
    if (identity) {
      preserved.name = identity.name;
    }

    // ALWAYS preserve suppressed memories (soul wisdom accumulation)
    // These persist across ALL reincarnations regardless of memory retention policy
    // The God of Death can see these when evaluating souls for ascension to angelhood
    const episodicMemory = entity.getComponent<EpisodicMemoryComponent>('episodic_memory');
    if (episodicMemory?.suppressedMemories && episodicMemory.suppressedMemories.length > 0) {
      preserved.suppressedMemories = [...episodicMemory.suppressedMemories];
    }

    // ALWAYS preserve soul wisdom (tracks reincarnation count and path to godhood)
    // If entity doesn't have SoulWisdomComponent, create one (first death)
    const soulWisdom = entity.getComponent<SoulWisdomComponent>('soul_wisdom');
    if (soulWisdom) {
      preserved.soulWisdom = { ...soulWisdom };
    } else {
      // First death - create initial soul wisdom component
      preserved.soulWisdom = createSoulWisdomComponent(currentTick);
    }

    // ALWAYS preserve soul identity (soul's true name, origin, and incarnation history)
    // This is THE core of the soul that persists across all incarnations
    const soulIdentity = entity.getComponent<SoulIdentityComponent>('soul_identity');
    if (soulIdentity) {
      preserved.soulIdentity = { ...soulIdentity };
    }

    // Preserve based on memory retention
    switch (memoryRetention) {
      case 'full':
        // Full memory retention - keep everything
        preserved.personality = entity.getComponent<PersonalityComponent>('personality');
        preserved.skills = entity.getComponent<SkillsComponent>('skills');
        preserved.memories = this.getSignificantMemories(entity, 1000); // All memories
        break;

      case 'fragments':
        // Partial retention - keep personality and some memories
        preserved.personality = entity.getComponent<PersonalityComponent>('personality');
        preserved.memories = this.getSignificantMemories(entity, 20); // Top 20 emotional memories
        break;

      case 'dreams':
        // Only dreams - keep some emotionally intense memories
        preserved.memories = this.getSignificantMemories(entity, 5); // Top 5 emotional memories
        break;

      case 'talents':
        // Skills carry over but not memories
        preserved.skills = entity.getComponent<SkillsComponent>('skills');
        break;

      case 'none':
      default:
        // Complete blank slate - nothing preserved
        break;
    }

    return preserved;
  }

  /**
   * Get the most emotionally significant memories
   */
  private getSignificantMemories(entity: Entity, limit: number): EpisodicMemory[] {
    const episodic = entity.getComponent<EpisodicMemoryComponent>('episodic_memory');
    if (!episodic?.episodicMemories) return [];

    // Sort by emotional intensity and get top N
    return [...episodic.episodicMemories]
      .sort((a, b) => Math.abs(b.emotionalIntensity) - Math.abs(a.emotionalIntensity))
      .slice(0, limit);
  }

  /**
   * Main update - check for souls ready to be reborn
   */
  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;
    const world = ctx.world;

    for (const [entityId, soul] of this.queuedSouls) {
      if (currentTick >= soul.rebirthAt) {
        this.performReincarnation(world, soul);
        this.queuedSouls.delete(entityId);
      }
    }
  }

  /**
   * Perform the actual reincarnation - spawn new entity
   */
  private performReincarnation(world: World, soul: QueuedSoul): void {
    // Determine spawn location
    const spawnLocation = this.determineSpawnLocation(world, soul);

    // Determine species and add species-specific components
    const speciesId = this.determineSpecies(soul);

    // Create new entity
    const newEntity = new EntityImpl(createEntityId(), world.tick);

    // Add core components
    newEntity.addComponent(createPositionComponent(spawnLocation.x, spawnLocation.y));
    newEntity.addComponent(createPhysicsComponent(false, 1, 1));
    newEntity.addComponent(createRenderableComponent('agent', 'entity'));
    newEntity.addComponent(createTagsComponent('agent', 'reincarnated'));

    // Add species-specific components from SpeciesRegistry
    const speciesTemplate = getSpeciesTemplate(speciesId);
    if (speciesTemplate) {
      const speciesComponent = createSpeciesFromTemplate(speciesTemplate);
      newEntity.addComponent(speciesComponent);
    }

    // Identity - use soul's true name if available, otherwise use body name
    const soulName = soul.preserved.soulIdentity?.soulName ?? soul.preserved.name ?? generateRandomName();
    newEntity.addComponent(createIdentityComponent(soulName));

    // Add SoulIdentityComponent (ALWAYS preserved across reincarnations)
    if (soul.preserved.soulIdentity) {
      // Add new incarnation record
      const incarnationRecord = {
        incarnationTick: world.tick,
        bodyName: soulName,
        bodySpecies: speciesId,
      };

      addIncarnationRecord(soul.preserved.soulIdentity, incarnationRecord);

      // Mark as reincarnated
      soul.preserved.soulIdentity.isReincarnated = true;

      newEntity.addComponent(soul.preserved.soulIdentity);
    }

    // Personality - preserved or new
    let personality: PersonalityComponentClass;
    if (soul.preserved.personality && (soul.config.memoryRetention === 'full' || soul.config.memoryRetention === 'fragments')) {
      const preserved = soul.preserved.personality;
      if (!preserved.openness || !preserved.conscientiousness || !preserved.extraversion ||
          !preserved.agreeableness || !preserved.neuroticism) {
        throw new Error('Preserved personality missing required traits');
      }
      personality = new PersonalityComponentClass({
        openness: preserved.openness,
        conscientiousness: preserved.conscientiousness,
        extraversion: preserved.extraversion,
        agreeableness: preserved.agreeableness,
        neuroticism: preserved.neuroticism,
      });
    } else {
      personality = new PersonalityComponentClass({
        openness: Math.random(),
        conscientiousness: Math.random(),
        extraversion: Math.random(),
        agreeableness: Math.random(),
        neuroticism: Math.random(),
      });
    }
    newEntity.addComponent(personality);

    // Skills - preserved or new based on personality
    let skills: SkillsComponent;
    if (soul.preserved.skills && (soul.config.memoryRetention === 'full' || soul.config.memoryRetention === 'talents')) {
      // Copy preserved skills with slight variation
      skills = this.copySkillsWithVariation(soul.preserved.skills);
    } else {
      skills = generateRandomStartingSkills(personality);
    }
    newEntity.addComponent(skills);

    // Agent component - reincarnated souls are always LLM agents
    const thinkInterval = 20;
    newEntity.addComponent(createAgentComponent('idle', thinkInterval, true, 0));

    // Movement
    newEntity.addComponent(createMovementComponent(2.0, 0, 0));

    // Needs - start fresh
    newEntity.addComponent(new NeedsComponent({
      hunger: 1.0,
      energy: 0.8,
      health: 1.0,
      hungerDecayRate: 0.0042,
      energyDecayRate: 0.005,
    }));

    // Memory
    newEntity.addComponent(new MemoryComponent(newEntity.id));

    // Episodic memory - with past life memories if retained
    const episodicMemory = new EpisodicMemoryComponentClass({ maxMemories: 1000 });
    const afterlifeMemoryIds = new Set<string>();

    if (soul.preserved.memories && soul.preserved.memories.length > 0) {
      // Add past life memories as dream-like fragments via formMemory
      for (const memory of soul.preserved.memories) {
        const newMemory = episodicMemory.formMemory({
          eventType: `past_life:${memory.eventType}`,
          summary: `[Past life memory] ${memory.summary}`,
          timestamp: world.tick, // New timestamp in this life
          participants: memory.participants,
          location: memory.location,
          emotionalValence: memory.emotionalValence,
          emotionalIntensity: memory.emotionalIntensity * 0.5, // Faded intensity
          surprise: memory.surprise,
          importance: memory.importance * 0.5, // Reduced importance
        });

        // Track afterlife memories (death-related events from previous life)
        // These include psychopomp conversations, judgment, realm transitions
        if (memory.eventType.startsWith('death:') ||
            memory.eventType.startsWith('realm:') ||
            memory.eventType === 'psychopomp:exchange' ||
            memory.eventType === 'psychopomp:judgment') {
          afterlifeMemoryIds.add(newMemory.id);
        }
      }
    }
    newEntity.addComponent(episodicMemory);

    // Restore suppressed memories from previous lives (soul wisdom accumulation)
    // These memories persist across ALL reincarnations, contributing to the soul's wisdom
    // The God of Death can see these when evaluating for ascension to angelhood
    if (soul.preserved.suppressedMemories && soul.preserved.suppressedMemories.length > 0) {
      for (const suppressedMemory of soul.preserved.suppressedMemories) {
        // Add directly to suppressed storage (bypassing active memory)
        // Access private field through bracket notation (necessary for reincarnation system)
        (episodicMemory as unknown as { _suppressedMemories: EpisodicMemory[] })._suppressedMemories.push(suppressedMemory);
      }
    }

    // Add AfterlifeMemoryComponent if any afterlife memories were transferred
    if (afterlifeMemoryIds.size > 0) {
      newEntity.addComponent(createAfterlifeMemoryComponent(afterlifeMemoryIds));
    }

    // Add/Update SoulWisdomComponent (tracks reincarnation count and path to godhood)
    if (soul.preserved.soulWisdom) {
      const suppressedCount = soul.preserved.suppressedMemories?.length ?? 0;
      const updatedWisdom = createReincarnatedSoulWisdomComponent(
        soul.preserved.soulWisdom,
        suppressedCount,
        world.tick
      );
      newEntity.addComponent(updatedWisdom);
    } else {
      // Shouldn't happen (created in preserveEntityData), but handle gracefully
      newEntity.addComponent(createSoulWisdomComponent(world.tick));
    }

    // Other memory components
    newEntity.addComponent(new SemanticMemoryComponent());
    // SocialMemoryComponent is now lazy-initialized on first social interaction
    newEntity.addComponent(new ReflectionComponent());
    newEntity.addComponent(new JournalComponent());

    // Vision - tiered awareness based on skill profile
    const visionProfile = getVisionProfileFromSkills(skills);
    newEntity.addComponent(createVisionForProfile(visionProfile));
    // ConversationComponent is lazy-initialized when conversations start
    // RelationshipComponent is now lazy-initialized when first relationship is formed

    // Inventory - start empty
    newEntity.addComponent(createInventoryComponent(24, 100));

    // Temperature
    newEntity.addComponent(createTemperatureComponent(20, 18, 24, 0, 35));

    // Circadian
    newEntity.addComponent(createCircadianComponent());

    // Navigation
    newEntity.addComponent(new SpatialMemoryComponent());
    newEntity.addComponent(new TrustNetworkComponent());
    newEntity.addComponent(new BeliefComponent());
    newEntity.addComponent(new SocialGradientComponent());
    newEntity.addComponent(new ExplorationStateComponent());
    newEntity.addComponent(createSteeringComponent('none', 2.0, 4.0));
    newEntity.addComponent(createVelocityComponent(0, 0));

    // Gathering stats
    newEntity.addComponent(createGatheringStatsComponent());

    // Spiritual - may have connection to deity that reincarnated them
    const spirituality = Math.random() * 0.3 + 0.5; // 0.5-0.8 range for reincarnated souls
    const spiritual = createSpiritualComponent(spirituality, soul.deityId);
    if (soul.deityId) {
      // Start with some faith in the deity that facilitated rebirth
      spiritual.faith = 0.3;
      spiritual.peakFaith = 0.3;
    }
    newEntity.addComponent(spiritual);

    // ✅ Soul/Body Separation: Add new incarnation-specific components
    // CurrentLifeMemoryComponent - memories from THIS lifetime only (fresh start)
    newEntity.addComponent(createCurrentLifeMemory(world.tick));

    // VeilOfForgettingComponent - manages past-life memory bleeds
    const pastLivesCount = soul.preserved.soulIdentity?.incarnationHistory.length ?? 0;
    newEntity.addComponent(createVeilOfForgetting(pastLivesCount));

    // Goals
    newEntity.addComponent(createGoalsComponent());

    // Combat stats
    newEntity.addComponent(createCombatStatsComponent({
      combatSkill: (skills.levels?.combat || 0) / 5,
      huntingSkill: (skills.levels?.hunting || 0) / 5,
      stealthSkill: (skills.levels?.stealth || 0) / 5,
    }));

    // Injury tracking - start with no injuries (healthy reincarnation)
    newEntity.addComponent(createInjuryComponent({
      injuryType: 'laceration',
      severity: 'minor',
      location: 'torso',
      injuries: [],
      skillPenalties: {},
      elapsed: 0,
      treated: false,
      untreatedDuration: 0,
    }));

    // Realm location - start in mortal realm
    newEntity.addComponent(createRealmLocationComponent('mortal'));

    // Add entity to world
    world.addEntity(newEntity);

    // Emit reincarnation complete event
    this.events.emit('soul:reincarnated', {
      originalEntityId: soul.originalEntityId,
      newEntityId: newEntity.id,
      deityId: soul.deityId,
      memoryRetention: soul.config.memoryRetention,
      speciesConstraint: soul.config.speciesConstraint,
      preservedMemoryCount: soul.preserved.memories?.length ?? 0,
      previousName: soul.preserved.name,
      newName: soulName,
      soulName: soul.preserved.soulIdentity?.soulName,
      soulOriginCulture: soul.preserved.soulIdentity?.soulOriginCulture,
      incarnationCount: soul.preserved.soulIdentity?.incarnationHistory.length ?? 0,
    }, soul.originalEntityId);

    // ✅ CONSERVATION OF GAME MATTER:
    // TODO: Full soul/body separation refactor needed
    //
    // CURRENT BEHAVIOR (temporary):
    // - Destroys entire entity (soul+body as one)
    // - Creates new entity with transferred data
    //
    // CORRECT BEHAVIOR (to implement):
    // - Keep soul entity alive (it's eternal)
    // - Only destroy body entity (temporary physical form)
    // - Create new body entity
    // - Link new body to existing soul via SoulLinkComponent
    // - Add CurrentLifeMemoryComponent and VeilOfForgettingComponent to new body
    //
    // For now, preserve the original behavior but log warning
    const originalEntity = world.getEntity(soul.originalEntityId);
    if (originalEntity) {
      console.warn(
        `[ReincarnationSystem] ⚠️ Destroying entity ${soul.originalEntityId} for reincarnation. ` +
        `This should be refactored to preserve soul entity and only create new body.`
      );
      (world as WorldMutator).destroyEntity(soul.originalEntityId, 'reincarnated');
    }
  }

  /**
   * Determine where to spawn the reincarnated entity
   */
  private determineSpawnLocation(_world: World, soul: QueuedSoul): { x: number; y: number } {
    // For same_world, spawn near death location with some randomness
    if (soul.config.target === 'same_world' && soul.preserved.deathLocation) {
      const offset = 10 + Math.random() * 20; // 10-30 tiles away
      const angle = Math.random() * Math.PI * 2;
      return {
        x: soul.preserved.deathLocation.x + Math.cos(angle) * offset,
        y: soul.preserved.deathLocation.y + Math.sin(angle) * offset,
      };
    }

    // For other targets, spawn at a random location
    // In a full implementation, this would look up realm/world spawn points
    return {
      x: (Math.random() - 0.5) * 100,
      y: (Math.random() - 0.5) * 100,
    };
  }

  /**
   * Determine species based on constraint
   */
  private determineSpecies(soul: QueuedSoul): string {
    switch (soul.config.speciesConstraint) {
      case 'same':
        return soul.preserved.species ?? 'human';

      case 'similar':
        if (soul.preserved.species) {
          // Find category and pick random from same category
          for (const [_category, speciesList] of Object.entries(SPECIES_CATEGORIES)) {
            if (speciesList.includes(soul.preserved.species)) {
              const selected = speciesList[Math.floor(Math.random() * speciesList.length)];
              return selected ?? 'human';
            }
          }
        }
        return 'human';

      case 'karmic': {
        // Based on deed score: positive = stay same or upgrade, negative = downgrade
        const score = soul.preserved.deedScore ?? 0;
        if (score > 50) {
          return 'human'; // High karma = humanoid
        } else if (score < -50) {
          // Low karma = beast
          const beasts = SPECIES_CATEGORIES.beast ?? ['wolf'];
          const selected = beasts[Math.floor(Math.random() * beasts.length)];
          return selected ?? 'wolf';
        }
        return soul.preserved.species ?? 'human';
      }

      case 'any':
      default: {
        // Random species from all categories
        const allCategories = Object.values(SPECIES_CATEGORIES);
        if (allCategories.length === 0) return 'human';
        const randomCategory = allCategories[Math.floor(Math.random() * allCategories.length)];
        if (!randomCategory || randomCategory.length === 0) return 'human';
        const selected = randomCategory[Math.floor(Math.random() * randomCategory.length)];
        return selected ?? 'human';
      }
    }
  }

  /**
   * Copy skills with some variation (talents fade slightly)
   */
  private copySkillsWithVariation(original: SkillsComponent): SkillsComponent {
    // Use generateRandomStartingSkills as a base and modify with preserved skills
    // This ensures we get a properly typed SkillsComponent
    const baseSkills = generateRandomStartingSkills(new PersonalityComponentClass({
      openness: Math.random(),
      conscientiousness: Math.random(),
      extraversion: Math.random(),
      agreeableness: Math.random(),
      neuroticism: Math.random(),
    }));

    // Override with preserved skills (reduced by 1 level)
    if (original.levels) {
      for (const [skillId, level] of Object.entries(original.levels)) {
        const reducedLevel = Math.max(0, Math.min(5, (level as number) - 1)) as 0 | 1 | 2 | 3 | 4 | 5;
        baseSkills.levels[skillId as SkillId] = reducedLevel;
        // Preserve affinities from original
        if (original.affinities?.[skillId as SkillId]) {
          baseSkills.affinities[skillId as SkillId] = original.affinities[skillId as SkillId];
        }
      }
    }

    // Reset experience for new life
    for (const skillId of Object.keys(baseSkills.experience) as SkillId[]) {
      baseSkills.experience[skillId] = 0;
      baseSkills.totalExperience[skillId] = 0;
    }

    return baseSkills;
  }

  /**
   * Get count of queued souls (for debugging/metrics)
   */
  getQueuedSoulCount(): number {
    return this.queuedSouls.size;
  }

  /**
   * Get all queued soul IDs (for debugging)
   */
  getQueuedSoulIds(): string[] {
    return Array.from(this.queuedSouls.keys());
  }
}
