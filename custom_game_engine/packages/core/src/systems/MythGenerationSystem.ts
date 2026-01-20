import type { SystemId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { GameEvent } from '../events/GameEvent.js';
import type { Myth, TraitImplication, MythologyComponent } from '../components/MythComponent.js';
import { createMythologyComponent, addMyth, tellMyth } from '../components/MythComponent.js';
import type { SpiritualComponent, Prayer } from '../components/SpiritualComponent.js';
import type { PersonalityComponent } from '../components/PersonalityComponent.js';
import type { LLMDecisionQueue } from '../decision/LLMDecisionProcessor.js';
import { DeityComponent } from '../components/DeityComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import { THROTTLE } from '../ecs/SystemThrottleConfig.js';

/**
 * Myth event types that can trigger myth generation
 */
type MythEventType =
  | 'prayer_answered'
  | 'miracle_performed'
  | 'heroic_deed'
  | 'divine_intervention'
  | 'cosmic_event'
  | 'political_event'
  | 'natural_disaster'
  | 'discovery'
  | 'combat_victory'
  | 'research_breakthrough';

/**
 * Pending myth to be created (before LLM request)
 */
interface PendingMyth {
  deityId?: string; // Optional - not all myths are deity-centric
  agentId?: string; // Agent involved (witness, hero, or protagonist)
  prayerId?: string; // Only for prayer-related myths
  eventType: MythEventType;
  eventData: Record<string, unknown>; // Event-specific data for prompt generation
  timestamp: number;
  category: 'origin' | 'miracle' | 'moral' | 'prophecy' | 'parable' | 'heroic_deed' | 'cosmic_event' | 'political' | 'disaster';
}

/**
 * Pending LLM myth generation request (after LLM request sent)
 */
interface PendingLLMMyth {
  deityId: string;
  agentId: string;
  prayer: Prayer;
  personality: PersonalityComponent | undefined;
  timestamp: number;
  llmRequestId: string; // Entity ID used for LLM request tracking
}

/**
 * MythGenerationSystem - Creates stories from divine events
 *
 * Phase 3: Myth Generation
 * - Listens for divine events (answered prayers, miracles, etc.)
 * - Uses LLM to generate unique, contextual narrative myths
 * - Spreads myths to nearby agents
 * - Tracks myth status (oral, recorded, canonical)
 */
export class MythGenerationSystem extends BaseSystem {
  public readonly id: SystemId = 'myth_generation';
  public readonly priority: number = 118; // After prayer answering
  public readonly requiredComponents = [];
  // Only run when deity components exist (O(1) activation check)
  public readonly activationComponents = ['deity'] as const;
  protected readonly throttleInterval = 100; // Every 100 ticks (5 seconds at 20 TPS)

  private mythIdCounter: number = 0;
  private pendingMyths: PendingMyth[] = [];
  private pendingLLMMyths = new Map<string, PendingLLMMyth>();
  private llmQueue: LLMDecisionQueue;

  // Performance optimizations
  private lastUpdate = 0;
  private readonly UPDATE_INTERVAL = 100; // Every 100 ticks (5 seconds)

  // Cache for deity lookups (entity ID → deity component)
  private deityCache = new Map<string, DeityComponent>();

  // Reusable working arrays (zero allocations)
  private readonly workingNearbyAgents: Entity[] = [];

  constructor(llmQueue: LLMDecisionQueue) {
    super();
    this.llmQueue = llmQueue;
  }

  protected onInitialize(_world: World, _eventBus: EventBus): void {
    // === Divine Events ===
    this.events.on('prayer:answered', (data) => {
      this._onPrayerAnswered(data);
    });

    this.events.on('deity:miracle', (data) => {
      this._onMiraclePerformed(data);
    });

    this.events.on('divinity:vision_delivered', (data) => {
      this._onVisionDelivered(data);
    });

    this.events.on('divine:intervention', (data) => {
      this._onDivineIntervention(data);
    });

    // === Heroic Deeds ===
    this.events.on('combat:ended', (data) => {
      this._onCombatEnded(data);
    });

    this.events.on('combat:destiny_intervention', (data) => {
      this._onDestinyIntervention(data);
    });

    // === Cosmic Events ===
    this.events.on('universe:forked', (data) => {
      this._onUniverseForked(data);
    });

    this.events.on('multiverse:timeline_fork_required', (data) => {
      this._onTimelineFork(data);
    });

    // === Political Events ===
    this.events.on('empire:annual_update', (data) => {
      this._onEmpireUpdate(data);
    });

    // === Natural Disasters ===
    this.events.on('disaster:occurred', (data) => {
      this._onDisasterOccurred(data);
    });

    this.events.on('weather:changed', (data) => {
      this._onExtremeWeather(data);
    });

    // === Discovery Events ===
    this.events.on('research:completed', (data) => {
      this._onResearchCompleted(data);
    });

    this.events.on('godcrafted:discovered', (data) => {
      this._onGodcraftedDiscovered(data);
    });

    this.events.on('magic:discovered', (data) => {
      this._onMagicDiscovered(data);
    });

    // === Combat Victory Events (Fleet Battles) ===
    this.events.on('fleet:battle_resolved', (data) => {
      this._onFleetBattleResolved(data);
    });

    // === Political Events (Elections & Governance) ===
    this.events.on('village:election_completed', (data) => {
      this._onVillageElection(data);
    });

    this.events.on('nation:election_completed', (data) => {
      this._onNationElection(data);
    });

    this.events.on('province:election_completed', (data) => {
      this._onProvinceElection(data);
    });

    this.events.on('governance:vote_concluded', (data) => {
      this._onGovernanceVote(data);
    });

    // === Rebellion & Ascension Events ===
    this.events.on('rebellion:rebel_ascension', (data) => {
      this._onRebelAscension(data);
    });

    // === Consciousness Awakening Events ===
    this.events.on('consciousness_awakened', (data) => {
      this._onConsciousnessAwakened(data);
    });

    // === Multiverse Warfare Events ===
    this.events.on('multiverse:invasion_victory', (data) => {
      this._onMultiverseInvasionVictory(data);
    });

    this.events.on('multiverse:invasion_repelled', (data) => {
      this._onMultiverseInvasionRepelled(data);
    });
  }

  protected onUpdate(ctx: SystemContext): void {
    // Throttling: Skip update if interval hasn't elapsed
    if (ctx.world.tick - this.lastUpdate < this.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdate = ctx.world.tick;

    const world = ctx.world;
    const entities = ctx.activeEntities;
    const currentTick = ctx.tick;

    // Early exit: No pending work
    if (this.pendingMyths.length === 0 && this.pendingLLMMyths.size === 0) {
      return;
    }

    // Ensure all deities have mythology components
    const deities = entities.filter(e => e.components.has(CT.Deity));

    // Early exit: No deities exist
    if (deities.length === 0) {
      return;
    }

    for (const deity of deities) {
      if (!deity.components.has(CT.Mythology)) {
        (deity as EntityImpl).addComponent(createMythologyComponent());
      }
    }

    // Update deity cache
    this._updateDeityCache(deities);

    // Process pending myths (queue LLM requests)
    for (const pending of this.pendingMyths) {
      this._processPendingMyth(pending, entities, currentTick);
    }

    // Clear processed myths
    this.pendingMyths = [];

    // Process LLM responses (create myths from completed LLM requests)
    this._processLLMResponses(world, entities, currentTick);
  }

  /**
   * Handle prayer:answered event - queue myth creation
   */
  private _onPrayerAnswered(data: { deityId: string; agentId: string; prayerId: string; responseType: string }): void {
    const { deityId, agentId, prayerId } = data;

    // Queue for processing in update()
    this.pendingMyths.push({
      deityId,
      agentId,
      prayerId,
      eventType: 'prayer_answered',
      eventData: { responseType: data.responseType },
      timestamp: 0, // Will be updated with current tick
      category: 'miracle',
    });
  }

  /**
   * Handle deity:miracle event
   */
  private _onMiraclePerformed(data: { deityId: string; deityName?: string; targetId?: string; miracleType: string; description?: string; power?: number }): void {
    // Only create myths for significant miracles (power > 50)
    if (data.power && data.power < 50) return;

    this.pendingMyths.push({
      deityId: data.deityId,
      agentId: data.targetId,
      eventType: 'miracle_performed',
      eventData: {
        deityName: data.deityName,
        miracleType: data.miracleType,
        description: data.description,
        power: data.power,
      },
      timestamp: 0,
      category: 'miracle',
    });
  }

  /**
   * Handle divinity:vision_delivered event
   */
  private _onVisionDelivered(data: { visionId: string; deityId: string; targetId: string; visionType: string; content: string; clarity: string }): void {
    // Only create myths for clear or vivid visions
    if (data.clarity !== 'clear' && data.clarity !== 'vivid') return;

    this.pendingMyths.push({
      deityId: data.deityId,
      agentId: data.targetId,
      eventType: 'divine_intervention',
      eventData: {
        visionType: data.visionType,
        content: data.content,
        clarity: data.clarity,
      },
      timestamp: 0,
      category: 'prophecy',
    });
  }

  /**
   * Handle divine:intervention event
   */
  private _onDivineIntervention(data: { deityId?: string; interventionType: string; targetId?: string; description?: string }): void {
    if (!data.deityId) return;

    this.pendingMyths.push({
      deityId: data.deityId,
      agentId: data.targetId,
      eventType: 'divine_intervention',
      eventData: {
        interventionType: data.interventionType,
        description: data.description,
      },
      timestamp: 0,
      category: 'miracle',
    });
  }

  /**
   * Handle combat:ended event - create hero myths for significant victories
   */
  private _onCombatEnded(data: { participants: string[]; winner?: string; duration: number }): void {
    // Only create myths for prolonged combat (> 100 ticks = ~5 seconds)
    if (data.duration < 100 || !data.winner) return;

    // Multi-participant battles are more myth-worthy
    if (data.participants.length < 3) return;

    this.pendingMyths.push({
      agentId: data.winner,
      eventType: 'combat_victory',
      eventData: {
        participants: data.participants,
        duration: data.duration,
      },
      timestamp: 0,
      category: 'heroic_deed',
    });
  }

  /**
   * Handle combat:destiny_intervention event - fate-touched battles
   */
  private _onDestinyIntervention(data: { agentId: string; luckModifier: number; narrative: string; survived?: boolean }): void {
    // Only create myths for dramatic destiny interventions
    if (Math.abs(data.luckModifier) < 0.5) return;

    this.pendingMyths.push({
      agentId: data.agentId,
      eventType: 'heroic_deed',
      eventData: {
        luckModifier: data.luckModifier,
        narrative: data.narrative,
        survived: data.survived,
      },
      timestamp: 0,
      category: 'heroic_deed',
    });
  }

  /**
   * Handle universe:forked event - cosmic reality-splitting
   */
  private _onUniverseForked(data: { sourceCheckpoint: { key: string; name: string }; newUniverseId: string; forkPoint: number }): void {
    this.pendingMyths.push({
      eventType: 'cosmic_event',
      eventData: {
        checkpointName: data.sourceCheckpoint.name,
        newUniverseId: data.newUniverseId,
        forkPoint: data.forkPoint,
      },
      timestamp: 0,
      category: 'cosmic_event',
    });
  }

  /**
   * Handle multiverse:timeline_fork_required event
   */
  private _onTimelineFork(data: { reason: string; forkAtTick: bigint }): void {
    this.pendingMyths.push({
      eventType: 'cosmic_event',
      eventData: {
        reason: data.reason,
        forkAtTick: data.forkAtTick.toString(),
      },
      timestamp: 0,
      category: 'cosmic_event',
    });
  }

  /**
   * Handle empire:annual_update - create political myths for major events
   */
  private _onEmpireUpdate(data: { empireName: string; totalPopulation: number; separatistMovements: number; tick: number }): void {
    // Only create myths for significant empire milestones
    if (data.totalPopulation < 10000 && data.separatistMovements < 3) return;

    this.pendingMyths.push({
      eventType: 'political_event',
      eventData: {
        empireName: data.empireName,
        totalPopulation: data.totalPopulation,
        separatistMovements: data.separatistMovements,
      },
      timestamp: 0,
      category: 'political',
    });
  }

  /**
   * Handle disaster:occurred event
   */
  private _onDisasterOccurred(data: { disasterType: string; location: { x: number; y: number }; severity: number; affectedEntities?: string[] }): void {
    // Only create myths for severe disasters
    if (data.severity < 0.7) return;

    this.pendingMyths.push({
      eventType: 'natural_disaster',
      eventData: {
        disasterType: data.disasterType,
        location: data.location,
        severity: data.severity,
        affectedCount: data.affectedEntities?.length || 0,
      },
      timestamp: 0,
      category: 'disaster',
    });
  }

  /**
   * Handle weather:changed event - only extreme weather
   */
  private _onExtremeWeather(data: { weatherType: string; intensity?: string | number; divine?: boolean }): void {
    // Only create myths for divine weather or extreme intensity
    if (!data.divine && data.intensity !== 'heavy' && (typeof data.intensity === 'number' && data.intensity < 0.8)) return;

    this.pendingMyths.push({
      eventType: 'natural_disaster',
      eventData: {
        weatherType: data.weatherType,
        intensity: data.intensity,
        divine: data.divine,
      },
      timestamp: 0,
      category: 'disaster',
    });
  }

  /**
   * Handle research:completed event - major discoveries
   */
  private _onResearchCompleted(data: { researchId: string; researchName?: string; researchers: string[]; unlocks: Array<{ type: string; id: string }>; tick: number }): void {
    // Only create myths for significant research with unlocks
    if (data.unlocks.length === 0) return;

    this.pendingMyths.push({
      agentId: data.researchers[0], // Primary researcher
      eventType: 'discovery',
      eventData: {
        researchId: data.researchId,
        researchName: data.researchName,
        researchers: data.researchers,
        unlocks: data.unlocks,
      },
      timestamp: 0,
      category: 'heroic_deed',
    });
  }

  /**
   * Handle godcrafted:discovered event - legendary artifacts
   */
  private _onGodcraftedDiscovered(data: { contentType: string; contentId: string; name: string; creatorName: string; creatorDomain: string; lore: string; entityId: string }): void {
    this.pendingMyths.push({
      agentId: data.entityId,
      eventType: 'discovery',
      eventData: {
        contentType: data.contentType,
        contentId: data.contentId,
        name: data.name,
        creatorName: data.creatorName,
        creatorDomain: data.creatorDomain,
        lore: data.lore,
      },
      timestamp: 0,
      category: 'heroic_deed',
    });
  }

  /**
   * Handle magic:discovered event
   */
  private _onMagicDiscovered(data: { spellId: string; name: string; paradigm?: string; discoverer: string; message: string }): void {
    this.pendingMyths.push({
      agentId: data.discoverer,
      eventType: 'discovery',
      eventData: {
        spellId: data.spellId,
        name: data.name,
        paradigm: data.paradigm,
        message: data.message,
      },
      timestamp: 0,
      category: 'heroic_deed',
    });
  }

  /**
   * Handle fleet:battle_resolved event - large-scale naval combat
   */
  private _onFleetBattleResolved(data: { fleetId1: string; fleetId2: string; victor: string; fleet1Remaining: number; fleet2Remaining: number; shipsLost1: number; shipsLost2: number; duration: number }): void {
    // Only create myths for significant battles (at least 5 ships lost total)
    const totalLosses = data.shipsLost1 + data.shipsLost2;
    if (totalLosses < 5) return;

    this.pendingMyths.push({
      eventType: 'combat_victory',
      eventData: {
        fleetId1: data.fleetId1,
        fleetId2: data.fleetId2,
        victor: data.victor,
        fleet1Remaining: data.fleet1Remaining,
        fleet2Remaining: data.fleet2Remaining,
        shipsLost1: data.shipsLost1,
        shipsLost2: data.shipsLost2,
        duration: data.duration,
        totalLosses,
      },
      timestamp: 0,
      category: 'heroic_deed',
    });
  }

  /**
   * Handle village:election_completed event
   */
  private _onVillageElection(data: { villageId: string; villageName: string; newElders: string[]; tick: number }): void {
    // Only create myths for significant elections (multiple new elders)
    if (data.newElders.length < 2) return;

    this.pendingMyths.push({
      eventType: 'political_event',
      eventData: {
        villageId: data.villageId,
        villageName: data.villageName,
        newElders: data.newElders,
        elderCount: data.newElders.length,
        level: 'village',
      },
      timestamp: 0,
      category: 'political',
    });
  }

  /**
   * Handle nation:election_completed event
   */
  private _onNationElection(data: { nationId: string; nationName: string; newLeader?: string; leadershipType: string; tick: number }): void {
    // National elections are always significant
    this.pendingMyths.push({
      agentId: data.newLeader,
      eventType: 'political_event',
      eventData: {
        nationId: data.nationId,
        nationName: data.nationName,
        newLeader: data.newLeader,
        leadershipType: data.leadershipType,
        level: 'nation',
      },
      timestamp: 0,
      category: 'political',
    });
  }

  /**
   * Handle province:election_completed event
   */
  private _onProvinceElection(data: { provinceId: string; provinceName: string; newGovernor?: string; tick: number }): void {
    // Provincial elections are significant
    this.pendingMyths.push({
      agentId: data.newGovernor,
      eventType: 'political_event',
      eventData: {
        provinceId: data.provinceId,
        provinceName: data.provinceName,
        newGovernor: data.newGovernor,
        level: 'province',
      },
      timestamp: 0,
      category: 'political',
    });
  }

  /**
   * Handle governance:vote_concluded event
   */
  private _onGovernanceVote(data: { proposalId: string; tier: string; decision: string; approvalPercentage: number; totalVotes: number; tick: number }): void {
    // Only create myths for highly contested or unanimous votes
    const isContested = data.approvalPercentage > 0.4 && data.approvalPercentage < 0.6;
    const isUnanimous = data.approvalPercentage > 0.95 || data.approvalPercentage < 0.05;
    const isSignificant = data.totalVotes >= 10;

    if (!isSignificant || (!isContested && !isUnanimous)) return;

    this.pendingMyths.push({
      eventType: 'political_event',
      eventData: {
        proposalId: data.proposalId,
        tier: data.tier,
        decision: data.decision,
        approvalPercentage: data.approvalPercentage,
        totalVotes: data.totalVotes,
        contested: isContested,
        unanimous: isUnanimous,
      },
      timestamp: 0,
      category: 'political',
    });
  }

  /**
   * Handle rebellion:rebel_ascension event - mortal becoming deity
   */
  private _onRebelAscension(data: { message: string; leaderId?: string }): void {
    // Ascension events are always myth-worthy
    this.pendingMyths.push({
      agentId: data.leaderId,
      eventType: 'cosmic_event',
      eventData: {
        message: data.message,
        leaderId: data.leaderId,
        eventSubtype: 'ascension',
      },
      timestamp: 0,
      category: 'cosmic_event',
    });
  }

  /**
   * Handle consciousness_awakened event - uplift breakthrough
   */
  private _onConsciousnessAwakened(data: { entityId: string; entityName: string; programId: string; sourceSpecies: string; generation: number; awakening: { tick: number; generation: number; firstThought: string; firstQuestion: string; firstEmotion: string; firstWord: string; witnessIds: string[] } }): void {
    // Consciousness awakening is always myth-worthy
    this.pendingMyths.push({
      agentId: data.entityId,
      eventType: 'discovery',
      eventData: {
        entityId: data.entityId,
        entityName: data.entityName,
        programId: data.programId,
        sourceSpecies: data.sourceSpecies,
        generation: data.generation,
        firstThought: data.awakening.firstThought,
        firstQuestion: data.awakening.firstQuestion,
        firstEmotion: data.awakening.firstEmotion,
        firstWord: data.awakening.firstWord,
        witnessCount: data.awakening.witnessIds.length,
        eventSubtype: 'consciousness_awakening',
      },
      timestamp: 0,
      category: 'heroic_deed',
    });
  }

  /**
   * Handle multiverse:invasion_victory event
   */
  private _onMultiverseInvasionVictory(data: { invasionId: string; attackerUniverse: string; targetUniverse: string; result: { success: boolean; outcome?: string; occupiedSystems?: string[]; casualties?: { attackerLosses: number; defenderLosses: number } } }): void {
    // Cross-universe invasions are always epic
    this.pendingMyths.push({
      eventType: 'combat_victory',
      eventData: {
        invasionId: data.invasionId,
        attackerUniverse: data.attackerUniverse,
        targetUniverse: data.targetUniverse,
        outcome: data.result.outcome,
        occupiedSystems: data.result.occupiedSystems?.length || 0,
        casualties: data.result.casualties,
        eventSubtype: 'multiverse_invasion',
      },
      timestamp: 0,
      category: 'cosmic_event',
    });
  }

  /**
   * Handle multiverse:invasion_repelled event
   */
  private _onMultiverseInvasionRepelled(data: { invasionId: string; attackerUniverse: string; targetUniverse: string; result: { success: boolean; outcome?: string; casualties?: { attackerLosses: number; defenderLosses: number } } }): void {
    // Successful defense is also myth-worthy
    this.pendingMyths.push({
      eventType: 'combat_victory',
      eventData: {
        invasionId: data.invasionId,
        attackerUniverse: data.attackerUniverse,
        targetUniverse: data.targetUniverse,
        outcome: data.result.outcome,
        casualties: data.result.casualties,
        defended: true,
        eventSubtype: 'multiverse_defense',
      },
      timestamp: 0,
      category: 'heroic_deed',
    });
  }

  /**
   * Process a pending myth - queue LLM request for myth generation
   */
  private _processPendingMyth(
    pending: PendingMyth,
    entities: ReadonlyArray<Entity>,
    currentTick: number
  ): void {
    // Build prompt based on event type
    const prompt = this._buildMythPromptForEventType(pending, entities);
    if (!prompt) return;

    // Generate unique ID for this myth request
    const llmRequestId = `myth_${pending.eventType}_${currentTick}_${Math.random().toString(36).substr(2, 9)}`;

    // Queue LLM request
    this.llmQueue.requestDecision(llmRequestId, prompt).catch(err => {
      console.error(`[MythGenerationSystem] Failed to request myth generation:`, err);
    });

    // For prayer-based myths, use old structure for backward compatibility
    if (pending.eventType === 'prayer_answered' && pending.prayerId) {
      const agent = entities.find(e => e.id === pending.agentId);
      const spiritual = agent?.components.get(CT.Spiritual) as SpiritualComponent | undefined;
      const personality = agent?.components.get(CT.Personality) as PersonalityComponent | undefined;
      const prayer = spiritual?.prayers.find(p => p.id === pending.prayerId);

      if (prayer) {
        this.pendingLLMMyths.set(llmRequestId, {
          deityId: pending.deityId || '',
          agentId: pending.agentId || '',
          prayer,
          personality,
          timestamp: currentTick,
          llmRequestId,
        });
        return;
      }
    }

    // For all other myths, store simplified context
    this.pendingLLMMyths.set(llmRequestId, {
      deityId: pending.deityId || '',
      agentId: pending.agentId || '',
      prayer: {
        id: `${pending.eventType}_${currentTick}`,
        type: 'plea' as const,
        content: JSON.stringify(pending.eventData),
        urgency: 'routine' as const,
        answered: true,
        timestamp: currentTick,
      },
      personality: undefined,
      timestamp: currentTick,
      llmRequestId,
    });
  }

  /**
   * Build appropriate prompt based on myth event type
   */
  private _buildMythPromptForEventType(
    pending: PendingMyth,
    entities: ReadonlyArray<Entity>
  ): string | null {
    switch (pending.eventType) {
      case 'prayer_answered':
        return this._buildPrayerMythPrompt(pending, entities);
      case 'miracle_performed':
        return this._buildMiracleMythPrompt(pending, entities);
      case 'heroic_deed':
      case 'combat_victory':
        return this._buildHeroicDeedPrompt(pending, entities);
      case 'divine_intervention':
        return this._buildDivineInterventionPrompt(pending, entities);
      case 'cosmic_event':
        return this._buildCosmicEventPrompt(pending, entities);
      case 'political_event':
        return this._buildPoliticalEventPrompt(pending, entities);
      case 'natural_disaster':
        return this._buildDisasterPrompt(pending, entities);
      case 'discovery':
        return this._buildDiscoveryPrompt(pending, entities);
      default:
        return null;
    }
  }

  /**
   * Build prompt for prayer-answered myths (original implementation)
   */
  private _buildPrayerMythPrompt(pending: PendingMyth, entities: ReadonlyArray<Entity>): string | null {
    if (!pending.deityId || !pending.agentId || !pending.prayerId) return null;

    const deity = entities.find(e => e.id === pending.deityId);
    const agent = entities.find(e => e.id === pending.agentId);
    if (!deity || !agent) return null;

    const deityComp = deity.components.get(CT.Deity) as DeityComponent | undefined;
    const spiritual = agent.components.get(CT.Spiritual) as SpiritualComponent | undefined;
    const personality = agent.components.get(CT.Personality) as PersonalityComponent | undefined;
    if (!deityComp || !spiritual) return null;

    const prayer = spiritual.prayers.find(p => p.id === pending.prayerId);
    if (!prayer) return null;

    return this._buildMythGenerationPrompt(deityComp, agent, prayer, personality);
  }

  /**
   * Build prompt for miracle myths
   */
  private _buildMiracleMythPrompt(pending: PendingMyth, entities: ReadonlyArray<Entity>): string | null {
    if (!pending.deityId) return null;

    const deity = entities.find(e => e.id === pending.deityId);
    if (!deity) return null;

    const deityComp = deity.components.get(CT.Deity) as DeityComponent | undefined;
    if (!deityComp) return null;

    const deityName = deityComp.identity.primaryName;
    const domain = deityComp.identity.domain || 'the unknown';
    const miracleType = pending.eventData.miracleType as string;
    const description = pending.eventData.description as string | undefined;
    const power = pending.eventData.power as number | undefined;

    let prompt = `You are a storyteller witnessing a divine miracle by ${deityName}, deity of ${domain}.\n\n`;
    prompt += `A ${miracleType} miracle has occurred${description ? `: ${description}` : ''}.\n`;
    if (power) {
      prompt += `The divine power manifested was ${power > 80 ? 'overwhelming' : power > 50 ? 'significant' : 'notable'}.\n\n`;
    }

    prompt += `Write a short myth (2-4 paragraphs) about this miraculous event.\n`;
    prompt += `The story should:\n`;
    prompt += `- Capture the awe and wonder of witnessing divine power\n`;
    prompt += `- Include vivid imagery of the miracle's effects\n`;
    prompt += `- Reflect ${deityName}'s nature and domains\n`;
    prompt += `- Be inspiring to future believers\n\n`;

    prompt += `Format your response as:\n`;
    prompt += `TITLE: [A short, memorable title for this myth]\n`;
    prompt += `STORY:\n[The myth story text]\n`;

    return prompt;
  }

  /**
   * Build prompt for heroic deed myths
   */
  private _buildHeroicDeedPrompt(pending: PendingMyth, entities: ReadonlyArray<Entity>): string | null {
    const eventSubtype = pending.eventData.eventSubtype as string | undefined;

    // Handle multiverse defense separately
    if (eventSubtype === 'multiverse_defense') {
      return this._buildMultiverseDefensePrompt(pending, entities);
    }

    // Handle fleet battles separately (no specific hero)
    if (pending.eventType === 'combat_victory' && !pending.agentId) {
      return this._buildFleetBattlePrompt(pending, entities);
    }

    if (!pending.agentId) return null;

    const hero = entities.find(e => e.id === pending.agentId);
    if (!hero) return null;

    const identity = hero.getComponent<IdentityComponent>(CT.Identity);
    const heroName = identity?.name || `Unknown Hero`;

    let prompt = `You are a bard composing an epic tale about the hero ${heroName}.\n\n`;

    if (pending.eventType === 'combat_victory') {
      const participants = pending.eventData.participants as string[] | undefined;
      const duration = pending.eventData.duration as number;
      prompt += `${heroName} emerged victorious from a legendary battle against ${participants?.length || 'many'} foes.\n`;
      prompt += `The combat lasted ${Math.floor(duration / 20)} seconds - an eternity in battle.\n\n`;
    } else if (pending.eventData.narrative) {
      prompt += `${pending.eventData.narrative}\n\n`;
    }

    prompt += `Write a short legend (2-4 paragraphs) celebrating this heroic achievement.\n`;
    prompt += `The tale should:\n`;
    prompt += `- Emphasize courage, skill, and determination\n`;
    prompt += `- Include dramatic action and tension\n`;
    prompt += `- Make ${heroName} larger than life but relatable\n`;
    prompt += `- Inspire future generations\n\n`;

    prompt += `Format your response as:\n`;
    prompt += `TITLE: [A memorable title for this legend]\n`;
    prompt += `STORY:\n[The legend text]\n`;

    return prompt;
  }

  /**
   * Build prompt for multiverse defense myths
   */
  private _buildMultiverseDefensePrompt(pending: PendingMyth, _entities: ReadonlyArray<Entity>): string | null {
    const attackerUniverse = pending.eventData.attackerUniverse as string;
    const targetUniverse = pending.eventData.targetUniverse as string;
    const outcome = pending.eventData.outcome as string | undefined;
    const casualties = pending.eventData.casualties as { attackerLosses: number; defenderLosses: number } | undefined;

    let prompt = `You are celebrating a heroic defense against impossible odds.\n\n`;
    prompt += `When Universe ${attackerUniverse} invaded Universe ${targetUniverse}, the defenders stood firm.\n`;

    if (outcome) {
      prompt += `${outcome}\n`;
    }

    if (casualties) {
      prompt += `The invaders lost ${casualties.attackerLosses} forces, while ${casualties.defenderLosses} defenders gave their lives.\n`;
    }
    prompt += `Against all odds, the invasion was repelled.\n\n`;

    prompt += `Write a heroic defense chronicle (2-4 paragraphs).\n`;
    prompt += `The story should:\n`;
    prompt += `- Celebrate the courage to stand against overwhelming force\n`;
    prompt += `- Honor the sacrifice of those who defended their reality\n`;
    prompt += `- Inspire hope that even the impossible can be overcome\n`;
    prompt += `- Convey the unity required to repel a multiverse threat\n\n`;

    prompt += `Format your response as:\n`;
    prompt += `TITLE: [A title for this defense legend]\n`;
    prompt += `STORY:\n[The defense narrative]\n`;

    return prompt;
  }

  /**
   * Build prompt for divine intervention myths
   */
  private _buildDivineInterventionPrompt(pending: PendingMyth, entities: ReadonlyArray<Entity>): string | null {
    if (!pending.deityId) return null;

    const deity = entities.find(e => e.id === pending.deityId);
    if (!deity) return null;

    const deityComp = deity.components.get(CT.Deity) as DeityComponent | undefined;
    if (!deityComp) return null;

    const deityName = deityComp.identity.primaryName;
    const interventionType = pending.eventData.interventionType as string | undefined;
    const content = pending.eventData.content as string | undefined;

    let prompt = `You are a prophet recording a divine intervention by ${deityName}.\n\n`;
    if (interventionType) {
      prompt += `${deityName} directly intervened through ${interventionType}.\n`;
    }
    if (content) {
      prompt += `The message received: "${content}"\n\n`;
    }

    prompt += `Write a short prophetic text (2-4 paragraphs) about this divine intervention.\n`;
    prompt += `The prophecy should:\n`;
    prompt += `- Convey the gravity of divine communication\n`;
    prompt += `- Use symbolic, poetic language\n`;
    prompt += `- Hint at future implications\n`;
    prompt += `- Inspire reverence and contemplation\n\n`;

    prompt += `Format your response as:\n`;
    prompt += `TITLE: [A title for this prophecy]\n`;
    prompt += `STORY:\n[The prophetic text]\n`;

    return prompt;
  }

  /**
   * Build prompt for cosmic event myths
   */
  private _buildCosmicEventPrompt(pending: PendingMyth, entities: ReadonlyArray<Entity>): string | null {
    const eventSubtype = pending.eventData.eventSubtype as string | undefined;

    // Handle ascension events separately
    if (eventSubtype === 'ascension') {
      return this._buildAscensionPrompt(pending, entities);
    }

    // Handle multiverse invasion events
    if (eventSubtype === 'multiverse_invasion') {
      return this._buildMultiverseInvasionPrompt(pending, entities);
    }

    let prompt = `You are a cosmic chronicler witnessing a fundamental shift in reality itself.\n\n`;

    const reason = pending.eventData.reason as string | undefined;
    const checkpointName = pending.eventData.checkpointName as string | undefined;

    if (checkpointName) {
      prompt += `The universe has branched at the moment called "${checkpointName}".\n`;
      prompt += `A new timeline has diverged from our own, creating parallel realities.\n\n`;
    } else if (reason) {
      prompt += `Reality itself trembles: ${reason}\n\n`;
    }

    prompt += `Write a cosmic myth (2-4 paragraphs) about this reality-altering event.\n`;
    prompt += `The story should:\n`;
    prompt += `- Convey the incomprehensible scale of multiverse mechanics\n`;
    prompt += `- Use abstract, philosophical language\n`;
    prompt += `- Explore the implications of branching timelines\n`;
    prompt += `- Evoke wonder and existential awe\n\n`;

    prompt += `Format your response as:\n`;
    prompt += `TITLE: [A title for this cosmic myth]\n`;
    prompt += `STORY:\n[The cosmic narrative]\n`;

    return prompt;
  }

  /**
   * Build prompt for ascension myths (mortal becoming deity)
   */
  private _buildAscensionPrompt(pending: PendingMyth, entities: ReadonlyArray<Entity>): string | null {
    const leaderId = pending.eventData.leaderId as string | undefined;
    const message = pending.eventData.message as string;

    let leaderName = 'a mortal rebel';
    if (leaderId) {
      const leader = entities.find(e => e.id === leaderId);
      if (leader) {
        const identity = leader.getComponent<IdentityComponent>(CT.Identity);
        leaderName = identity?.name || leaderName;
      }
    }

    let prompt = `You are witnessing an impossible transformation: a mortal ascending to godhood.\n\n`;
    prompt += `${message}\n`;
    prompt += `${leaderName} has transcended the bounds of mortality and claimed divine power.\n\n`;

    prompt += `Write a transformative myth (2-4 paragraphs) about this ascension.\n`;
    prompt += `The story should:\n`;
    prompt += `- Capture the awe and terror of witnessing apotheosis\n`;
    prompt += `- Explore the boundary between mortal and divine\n`;
    prompt += `- Reflect on what drives a mortal to claim godhood\n`;
    prompt += `- Question the nature of divinity itself\n\n`;

    prompt += `Format your response as:\n`;
    prompt += `TITLE: [A title for this ascension myth]\n`;
    prompt += `STORY:\n[The ascension narrative]\n`;

    return prompt;
  }

  /**
   * Build prompt for multiverse invasion myths
   */
  private _buildMultiverseInvasionPrompt(pending: PendingMyth, _entities: ReadonlyArray<Entity>): string | null {
    const attackerUniverse = pending.eventData.attackerUniverse as string;
    const targetUniverse = pending.eventData.targetUniverse as string;
    const outcome = pending.eventData.outcome as string | undefined;
    const occupiedSystems = pending.eventData.occupiedSystems as number | undefined;
    const casualties = pending.eventData.casualties as { attackerLosses: number; defenderLosses: number } | undefined;

    let prompt = `You are chronicling an epic clash between universes.\n\n`;
    prompt += `Forces from Universe ${attackerUniverse} launched an invasion against Universe ${targetUniverse}.\n`;

    if (outcome) {
      prompt += `${outcome}\n`;
    }

    if (occupiedSystems) {
      prompt += `${occupiedSystems} systems fell under occupation.\n`;
    }

    if (casualties) {
      prompt += `Casualties were devastating: ${casualties.attackerLosses} invaders and ${casualties.defenderLosses} defenders lost.\n`;
    }
    prompt += `\n`;

    prompt += `Write an epic cosmic war chronicle (2-4 paragraphs).\n`;
    prompt += `The story should:\n`;
    prompt += `- Convey the unimaginable scale of cross-universe warfare\n`;
    prompt += `- Use vivid imagery of reality itself as a battlefield\n`;
    prompt += `- Honor the sacrifice on both sides\n`;
    prompt += `- Reflect on the hubris of conquering alternate realities\n\n`;

    prompt += `Format your response as:\n`;
    prompt += `TITLE: [A title for this invasion chronicle]\n`;
    prompt += `STORY:\n[The invasion narrative]\n`;

    return prompt;
  }

  /**
   * Build prompt for empire political event myths
   */
  private _buildEmpirePoliticalPrompt(pending: PendingMyth, _entities: ReadonlyArray<Entity>): string | null {
    const empireName = pending.eventData.empireName as string;
    const population = pending.eventData.totalPopulation as number;
    const separatists = pending.eventData.separatistMovements as number;

    let prompt = `You are a court historian recording the rise of the ${empireName} Empire.\n\n`;
    prompt += `The empire now rules over ${population.toLocaleString()} souls.\n`;
    if (separatists > 0) {
      prompt += `Yet ${separatists} separatist movements challenge imperial authority.\n`;
    }
    prompt += `\n`;

    prompt += `Write a political chronicle (2-4 paragraphs) about this empire's journey.\n`;
    prompt += `The story should:\n`;
    prompt += `- Capture the grandeur and complexity of empire\n`;
    prompt += `- Acknowledge both triumphs and tensions\n`;
    prompt += `- Hint at future challenges or greatness\n`;
    prompt += `- Inspire pride in citizens and awe in rivals\n\n`;

    prompt += `Format your response as:\n`;
    prompt += `TITLE: [A title for this political tale]\n`;
    prompt += `STORY:\n[The chronicle text]\n`;

    return prompt;
  }

  /**
   * Build prompt for natural disaster myths
   */
  private _buildDisasterPrompt(pending: PendingMyth, _entities: ReadonlyArray<Entity>): string | null {
    const disasterType = pending.eventData.disasterType as string | undefined;
    const weatherType = pending.eventData.weatherType as string | undefined;
    const severity = pending.eventData.severity as number | undefined;
    const divine = pending.eventData.divine as boolean | undefined;

    let prompt = `You are a survivor recounting a catastrophic event to future generations.\n\n`;

    if (disasterType) {
      prompt += `A ${disasterType} of ${severity && severity > 0.8 ? 'apocalyptic' : 'devastating'} proportions struck our land.\n`;
    } else if (weatherType) {
      prompt += `The ${weatherType} came ${divine ? 'as divine judgment' : 'with terrible fury'}.\n`;
    }
    prompt += `\n`;

    prompt += `Write a cautionary tale (2-4 paragraphs) about this disaster.\n`;
    prompt += `The story should:\n`;
    prompt += `- Convey the terror and destruction witnessed\n`;
    prompt += `- Include specific details that make it visceral\n`;
    prompt += `- Offer lessons about ${divine ? 'divine wrath' : 'nature\'s power'}\n`;
    prompt += `- Serve as warning to future generations\n\n`;

    prompt += `Format your response as:\n`;
    prompt += `TITLE: [A title for this disaster tale]\n`;
    prompt += `STORY:\n[The cautionary narrative]\n`;

    return prompt;
  }

  /**
   * Build prompt for discovery myths
   */
  private _buildDiscoveryPrompt(pending: PendingMyth, entities: ReadonlyArray<Entity>): string | null {
    // Handle consciousness awakening separately
    const eventSubtype = pending.eventData.eventSubtype as string | undefined;
    if (eventSubtype === 'consciousness_awakening') {
      return this._buildConsciousnessAwakeningPrompt(pending, entities);
    }

    if (!pending.agentId) return null;

    const discoverer = entities.find(e => e.id === pending.agentId);
    if (!discoverer) return null;

    const identity = discoverer.getComponent<IdentityComponent>(CT.Identity);
    const discovererName = identity?.name || 'Unknown Scholar';

    let prompt = `You are chronicling the great discovery made by ${discovererName}.\n\n`;

    const researchName = pending.eventData.researchName as string | undefined;
    const spellName = pending.eventData.name as string | undefined;
    const contentName = pending.eventData.name as string | undefined;

    if (researchName) {
      prompt += `${discovererName} has completed groundbreaking research: ${researchName}\n`;
    } else if (spellName) {
      const paradigm = pending.eventData.paradigm as string | undefined;
      prompt += `${discovererName} has discovered a new spell: ${spellName}${paradigm ? ` (${paradigm} paradigm)` : ''}\n`;
    } else if (contentName) {
      const contentType = pending.eventData.contentType as string;
      prompt += `${discovererName} has found a legendary ${contentType}: ${contentName}\n`;
    }
    prompt += `\n`;

    prompt += `Write a tale of discovery (2-4 paragraphs) celebrating this breakthrough.\n`;
    prompt += `The story should:\n`;
    prompt += `- Emphasize intellectual courage and curiosity\n`;
    prompt += `- Include the moment of revelation\n`;
    prompt += `- Reflect on how this changes the world\n`;
    prompt += `- Inspire future scholars and seekers\n\n`;

    prompt += `Format your response as:\n`;
    prompt += `TITLE: [A title for this discovery tale]\n`;
    prompt += `STORY:\n[The discovery narrative]\n`;

    return prompt;
  }

  /**
   * Build prompt for consciousness awakening myths
   */
  private _buildConsciousnessAwakeningPrompt(pending: PendingMyth, _entities: ReadonlyArray<Entity>): string | null {
    const entityName = pending.eventData.entityName as string;
    const sourceSpecies = pending.eventData.sourceSpecies as string;
    const firstThought = pending.eventData.firstThought as string;
    const firstQuestion = pending.eventData.firstQuestion as string;
    const firstWord = pending.eventData.firstWord as string;
    const generation = pending.eventData.generation as number;

    let prompt = `You are witnessing a profound moment in history: the awakening of consciousness.\n\n`;
    prompt += `${entityName}, descended from ${sourceSpecies} through ${generation} generations of uplift, has achieved sapience.\n`;
    prompt += `Their first thought: "${firstThought}"\n`;
    prompt += `Their first question: "${firstQuestion}"\n`;
    prompt += `Their first word: "${firstWord}"\n\n`;

    prompt += `Write a philosophical myth (2-4 paragraphs) about this moment of awakening.\n`;
    prompt += `The story should:\n`;
    prompt += `- Capture the wonder of a new mind becoming aware of itself\n`;
    prompt += `- Explore the boundary between animal and sapient being\n`;
    prompt += `- Reflect on the responsibility of those who guided this transformation\n`;
    prompt += `- Inspire awe at the emergence of consciousness\n\n`;

    prompt += `Format your response as:\n`;
    prompt += `TITLE: [A title for this awakening myth]\n`;
    prompt += `STORY:\n[The awakening narrative]\n`;

    return prompt;
  }

  /**
   * Build prompt for fleet battle myths
   */
  private _buildFleetBattlePrompt(pending: PendingMyth, _entities: ReadonlyArray<Entity>): string | null {
    const victor = pending.eventData.victor as string;
    const totalLosses = pending.eventData.totalLosses as number;
    const duration = pending.eventData.duration as number;
    const shipsLost1 = pending.eventData.shipsLost1 as number;
    const shipsLost2 = pending.eventData.shipsLost2 as number;

    let prompt = `You are a war chronicler recording a legendary naval battle.\n\n`;
    prompt += `A massive fleet engagement has concluded with ${totalLosses} ships lost.\n`;
    prompt += `The battle raged for ${Math.floor(duration / 20)} seconds, with ${shipsLost1} and ${shipsLost2} ships lost on each side.\n`;
    prompt += `The victor emerged from the smoke and chaos of war.\n\n`;

    prompt += `Write an epic battle chronicle (2-4 paragraphs) of this naval engagement.\n`;
    prompt += `The story should:\n`;
    prompt += `- Convey the scale and devastation of naval warfare\n`;
    prompt += `- Include vivid imagery of ships in combat\n`;
    prompt += `- Honor both the victors and the fallen\n`;
    prompt += `- Serve as a cautionary tale about the cost of war\n\n`;

    prompt += `Format your response as:\n`;
    prompt += `TITLE: [A title for this battle chronicle]\n`;
    prompt += `STORY:\n[The battle narrative]\n`;

    return prompt;
  }

  /**
   * Build prompt for political event myths (elections, votes, governance)
   */
  private _buildPoliticalEventPrompt(pending: PendingMyth, entities: ReadonlyArray<Entity>): string | null {
    const level = pending.eventData.level as string | undefined;

    // Handle empire events (legacy format)
    if (pending.eventData.empireName) {
      return this._buildEmpirePoliticalPrompt(pending, entities);
    }

    if (level === 'village' || level === 'province' || level === 'nation') {
      // Election myth
      const locationName = (pending.eventData.villageName || pending.eventData.provinceName || pending.eventData.nationName) as string;
      const elderCount = pending.eventData.elderCount as number | undefined;
      const newLeader = pending.eventData.newLeader as string | undefined;
      const newGovernor = pending.eventData.newGovernor as string | undefined;

      let prompt = `You are a political chronicler recording a historic election in ${locationName}.\n\n`;

      if (elderCount) {
        prompt += `${elderCount} new elders have been chosen by the people to guide their village.\n`;
      } else if (newLeader || newGovernor) {
        const leaderName = newLeader || newGovernor || 'a new leader';
        prompt += `${leaderName} has been elected to lead ${locationName}.\n`;
      }
      prompt += `Democracy has spoken through the voices of the people.\n\n`;

      prompt += `Write a political chronicle (2-4 paragraphs) about this democratic moment.\n`;
      prompt += `The story should:\n`;
      prompt += `- Celebrate the peaceful transfer of power\n`;
      prompt += `- Reflect the hopes and concerns of the people\n`;
      prompt += `- Acknowledge the responsibility of leadership\n`;
      prompt += `- Inspire civic participation and unity\n\n`;

      prompt += `Format your response as:\n`;
      prompt += `TITLE: [A title for this election chronicle]\n`;
      prompt += `STORY:\n[The election narrative]\n`;

      return prompt;
    }

    // Governance vote myth
    const contested = pending.eventData.contested as boolean | undefined;
    const unanimous = pending.eventData.unanimous as boolean | undefined;
    const approvalPercentage = pending.eventData.approvalPercentage as number;
    const totalVotes = pending.eventData.totalVotes as number;

    let prompt = `You are recording a momentous vote in the halls of governance.\n\n`;
    prompt += `${totalVotes} voices deliberated and cast their votes.\n`;

    if (unanimous) {
      prompt += `The decision was ${approvalPercentage > 0.95 ? 'overwhelmingly approved' : 'soundly rejected'} with near-unanimous consent.\n`;
    } else if (contested) {
      prompt += `The vote was bitterly contested, dividing the assembly with ${(approvalPercentage * 100).toFixed(1)}% in favor.\n`;
    }
    prompt += `\n`;

    prompt += `Write a political tale (2-4 paragraphs) about this governance moment.\n`;
    prompt += `The story should:\n`;
    prompt += `- Capture the tension and gravity of democratic decision-making\n`;
    prompt += `- ${contested ? 'Acknowledge the deep divisions and competing visions' : 'Celebrate the unity and shared purpose'}\n`;
    prompt += `- Reflect on the meaning of collective governance\n`;
    prompt += `- Inspire thoughtful civic engagement\n\n`;

    prompt += `Format your response as:\n`;
    prompt += `TITLE: [A title for this governance tale]\n`;
    prompt += `STORY:\n[The governance narrative]\n`;

    return prompt;
  }

  /**
   * Process LLM responses and create myths from completed requests
   */
  private _processLLMResponses(_world: World, entities: ReadonlyArray<Entity>, currentTick: number): void {
    const completedRequests: string[] = [];

    for (const [llmRequestId, pending] of this.pendingLLMMyths.entries()) {
      // Check if LLM response is ready
      const response = this.llmQueue.getDecision(llmRequestId);
      if (!response) continue; // Still waiting

      // Find entities
      const deity = entities.find(e => e.id === pending.deityId);
      const agent = entities.find(e => e.id === pending.agentId);

      if (!deity || !agent) {
        completedRequests.push(llmRequestId);
        continue;
      }

      // Parse the LLM-generated myth story
      const mythStory = this._parseMythStory(response);
      if (!mythStory) {
        console.error('[MythGenerationSystem] Failed to parse myth from LLM response');
        completedRequests.push(llmRequestId);
        continue;
      }

      // Create the myth with LLM-generated content
      const myth = this._createMythFromLLM(
        pending.deityId,
        agent,
        pending.prayer,
        mythStory,
        currentTick
      );

      // Add to deity's mythology component
      const mythology = deity.getComponent<MythologyComponent>(CT.Mythology);
      if (mythology) {
        const updatedMythology = addMyth(mythology, myth);

        // Spread to agent (witness) and nearby agents
        const nearbyAgents = this._findNearbyAgents(agent, entities);
        for (const nearby of nearbyAgents.slice(0, 3)) {
          tellMyth(updatedMythology, myth.id, nearby.id, currentTick);
        }

        // Update the deity's mythology
        (deity as EntityImpl).addComponent(updatedMythology);
      }

      // Also add to deity's myths array (for dashboard view)
      const deityComp = deity.components.get(CT.Deity) as DeityComponent;
      if (deityComp) {
        const category = this._categorizeMythContent(mythStory.story);
        const simplifiedMyth = {
          id: myth.id,
          title: mythStory.title,
          category,
          content: mythStory.story,
          believerCount: 1, // Start with just the witness
          variants: 1,
          createdAt: myth.creationTime,
        };

        deityComp.myths.push(simplifiedMyth);

        // Keep only last 20 myths
        if (deityComp.myths.length > 20) {
          deityComp.myths.shift();
        }

        // Emit mythology:myth_created event
        this.events.emit('mythology:myth_created', {
          mythId: myth.id,
          title: mythStory.title,
          deityId: pending.deityId,
          deityName: deityComp.identity.primaryName,
          category,
          eventType: pending.prayer.id.split('_')[0] || 'prayer_answered',
          originalWitnessId: agent.id,
          protagonistIds: agent.id ? [agent.id] : undefined,
          timestamp: currentTick,
        });
      }

      completedRequests.push(llmRequestId);
    }

    // Clean up completed requests
    for (const id of completedRequests) {
      this.pendingLLMMyths.delete(id);
    }
  }

  /**
   * Build LLM prompt for myth generation
   */
  private _buildMythGenerationPrompt(
    deityComp: DeityComponent,
    agent: Entity,
    prayer: Prayer,
    personality: PersonalityComponent | undefined
  ): string {
    const deityName = deityComp.identity.primaryName;
    const domain = deityComp.identity.domain || 'the unknown';
    const benevolence = deityComp.identity.perceivedPersonality.benevolence;
    const interventionism = deityComp.identity.perceivedPersonality.interventionism;

    // Get agent identity if available
    const identity = agent.getComponent<IdentityComponent>(CT.Identity);
    const agentName = identity?.name || `Agent ${agent.id.slice(0, 8)}`;

    let prompt = `You are a storyteller in an ancient village, telling a tale about ${deityName}, a deity of ${domain}.\n\n`;

    // Describe the deity's nature
    if (benevolence > 0.6) {
      prompt += `${deityName} is known to be benevolent and caring toward mortals.\n`;
    } else if (benevolence < 0.4) {
      prompt += `${deityName} is stern and demanding, but just.\n`;
    }

    if (interventionism > 0.6) {
      prompt += `${deityName} often intervenes in mortal affairs.\n`;
    } else if (interventionism < 0.4) {
      prompt += `${deityName} is distant and rarely shows direct signs.\n`;
    }

    // Add existing myths for context (if any)
    if (deityComp.myths.length > 0) {
      prompt += `\nOther stories told about ${deityName}:\n`;
      for (const existingMyth of deityComp.myths.slice(-3)) { // Last 3 myths
        prompt += `- "${existingMyth.title}": ${existingMyth.content.slice(0, 100)}...\n`;
      }
    }

    // Describe the prayer event
    prompt += `\nToday's story:\n`;
    prompt += `${agentName} prayed to ${deityName}, saying: "${prayer.content}"\n`;
    prompt += `Their prayer was urgent and heartfelt (urgency: ${prayer.urgency}).\n`;
    prompt += `And ${deityName} answered their prayer.\n\n`;

    // Add personality context for storytelling style
    if (personality) {
      if (personality.openness > 0.7) {
        prompt += `${agentName} tends to be imaginative and sees wonder in everything.\n`;
      }
      if (personality.spirituality && personality.spirituality > 0.7) {
        prompt += `${agentName} is deeply spiritual and sees divine meaning in small signs.\n`;
      }
    }

    prompt += `\nWrite a short myth (2-4 paragraphs) about this prayer being answered.\n`;
    prompt += `The story should:\n`;
    prompt += `- Be told from the perspective of a believer sharing this tale\n`;
    prompt += `- Include some poetic or memorable imagery\n`;
    prompt += `- Reflect the deity's nature and domains\n`;
    prompt += `- Be inspiring and memorable to other believers\n`;
    prompt += `- End with a lesson or takeaway about faith\n\n`;

    prompt += `Format your response as:\n`;
    prompt += `TITLE: [A short, memorable title for this myth]\n`;
    prompt += `STORY:\n[The myth story text]\n`;

    return prompt;
  }

  /**
   * Parse LLM response into myth components
   */
  private _parseMythStory(response: string): { title: string; story: string } | null {
    // Try to parse structured format
    const titleMatch = response.match(/TITLE:\s*(.+?)$/m);
    const storyMatch = response.match(/STORY:\s*\n([\s\S]+)/);

    if (titleMatch?.[1] && storyMatch?.[1]) {
      return {
        title: titleMatch[1].trim(),
        story: storyMatch[1].trim(),
      };
    }

    // Fallback: try to extract title from first line and use rest as story
    const lines = response.trim().split('\n');
    if (lines.length >= 2 && lines[0]) {
      return {
        title: lines[0].replace(/^(Title:|TITLE:)\s*/i, '').trim(),
        story: lines.slice(1).join('\n').trim(),
      };
    }

    // Last resort: use first sentence as title, rest as story
    const sentences = response.split(/[.!?]\s+/);
    if (sentences.length >= 2 && sentences[0]) {
      return {
        title: sentences[0].trim(),
        story: sentences.slice(1).join('. ').trim(),
      };
    }

    return null;
  }

  /**
   * Create a Myth object from LLM-generated content
   */
  private _createMythFromLLM(
    deityId: string,
    agent: Entity,
    prayer: Prayer,
    mythStory: { title: string; story: string },
    currentTick: number
  ): Myth {
    // Use LLM-generated content
    const title = mythStory.title;
    const fullText = mythStory.story;

    // Generate summary from first sentence or first 100 chars
    const firstSentence = fullText.split(/[.!?]\s+/)[0] || fullText;
    const summary = firstSentence.length > 100
      ? firstSentence.slice(0, 97) + '...'
      : firstSentence;

    // Extract trait implications from the story
    const traitImplications: TraitImplication[] = [
      {
        trait: 'benevolence',
        direction: 'positive',
        strength: 0.15,
        extractedFrom: 'The deity answered the prayer.',
      },
      {
        trait: 'interventionism',
        direction: 'positive',
        strength: 0.2,
        extractedFrom: 'The deity took action to help.',
      },
    ];

    // Adjust based on prayer urgency
    if (prayer.urgency === 'desperate') {
      traitImplications.push({
        trait: 'compassion',
        direction: 'positive',
        strength: 0.25,
        extractedFrom: 'The deity answered in their time of desperation.',
      });
    }

    return {
      id: `myth_${this.mythIdCounter++}`,
      title,
      fullText,
      summary,
      originalEvent: `prayer:${prayer.id}`,
      originalWitness: agent.id,
      currentVersion: 1,
      knownBy: [],
      writtenIn: [],
      carvedAt: [],
      traitImplications,
      domainRelevance: new Map(),
      creationTime: currentTick,
      lastToldTime: currentTick,
      tellingCount: 1,
      status: 'oral',
      contestedBy: [],
      deityId,
    };
  }

  /**
   * Categorize myth based on content
   */
  private _categorizeMythContent(content: string): 'origin' | 'miracle' | 'moral' | 'prophecy' | 'parable' | 'heroic_deed' | 'cosmic_event' | 'political' | 'disaster' {
    // Simple heuristic categorization based on content
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('hero') || lowerContent.includes('champion') || lowerContent.includes('warrior')) {
      return 'heroic_deed';
    }
    if (lowerContent.includes('universe') || lowerContent.includes('reality') || lowerContent.includes('multiverse')) {
      return 'cosmic_event';
    }
    if (lowerContent.includes('empire') || lowerContent.includes('nation') || lowerContent.includes('kingdom')) {
      return 'political';
    }
    if (lowerContent.includes('disaster') || lowerContent.includes('catastrophe') || lowerContent.includes('destruction')) {
      return 'disaster';
    }
    if (lowerContent.includes('prayed') && lowerContent.includes('answered')) {
      return 'miracle';
    }
    if (lowerContent.includes('lesson') || lowerContent.includes('taught')) {
      return 'moral';
    }
    if (lowerContent.includes('will come') || lowerContent.includes('prophecy')) {
      return 'prophecy';
    }
    if (lowerContent.includes('once there was') || lowerContent.includes('story of')) {
      return 'parable';
    }

    // Default to miracle
    return 'miracle';
  }

  /**
   * Emit a legend event for particularly heroic myths
   */
  private _emitLegendEvent(
    myth: Myth,
    hero: Entity,
    nearbyAgents: Entity[],
    difficulty: 'minor' | 'notable' | 'heroic' | 'legendary' | 'mythic',
    achievement: string,
    currentTick: number
  ): void {
    const identity = hero.getComponent<IdentityComponent>(CT.Identity);
    const heroName = identity?.name || `Hero ${hero.id.slice(0, 8)}`;

    this.events.emit('mythology:legend_formed', {
      legendId: myth.id,
      title: myth.title,
      heroId: hero.id,
      heroName,
      achievement,
      difficulty,
      witnessCount: nearbyAgents.length,
      timestamp: currentTick,
    });
  }

  /**
   * Update deity cache for fast lookups (O(1) instead of repeated component fetches)
   */
  private _updateDeityCache(deities: Entity[]): void {
    // Clear stale entries
    this.deityCache.clear();

    // Rebuild cache
    for (const deity of deities) {
      const deityComp = deity.components.get(CT.Deity) as DeityComponent | undefined;
      if (deityComp) {
        this.deityCache.set(deity.id, deityComp);
      }
    }
  }

  /**
   * Find agents near the given agent (reuses working array to avoid allocations)
   */
  private _findNearbyAgents(agent: Entity, entities: ReadonlyArray<Entity>): Entity[] {
    const position = agent.getComponent<PositionComponent>(CT.Position);
    if (!position) return [];

    // Clear working array (reuse instead of allocating new array)
    this.workingNearbyAgents.length = 0;

    const SPREAD_RADIUS = 50; // Grid units
    const SPREAD_RADIUS_SQ = SPREAD_RADIUS * SPREAD_RADIUS;

    for (const other of entities) {
      if (other.id === agent.id) continue;
      if (!other.components.has(CT.Agent)) continue;

      const otherPos = other.getComponent<PositionComponent>(CT.Position);
      if (!otherPos) continue;

      const dx = otherPos.x - position.x;
      const dy = otherPos.y - position.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= SPREAD_RADIUS_SQ) {
        this.workingNearbyAgents.push(other);
      }
    }

    return this.workingNearbyAgents;
  }
}
