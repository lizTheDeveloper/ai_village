/**
 * TVCulturalImpactSystem - Cultural influence from TV content
 *
 * Handles:
 * - Catchphrase propagation through population
 * - Fashion trends from shows
 * - Fan communities and fandoms
 * - Celebrity status for actors
 * - Cultural memory of iconic moments
 *
 * Key Feature: Catchphrases create STRONG episodic memories
 * "Did I do that?" - Steve Urkel (Family Matters)
 * These memories stick with agents for decades, just like real TV catchphrases.
 */

import type { World } from '../../ecs/World.js';
import type { EventBus } from '../../events/EventBus.js';
import type { Entity } from '../../ecs/Entity.js';
import { BaseSystem, type SystemContext } from '../../ecs/SystemContext.js';
import { SystemEventManager } from '../../events/TypedEventEmitter.js';
import { ComponentType } from '../../types/ComponentType.js';
import { EpisodicMemoryComponent } from '../../components/EpisodicMemoryComponent.js';

// ============================================================================
// CULTURAL IMPACT TYPES
// ============================================================================

export interface Catchphrase {
  id: string;
  phrase: string;
  originShowId: string;
  originCharacter: string;
  createdTick: number;

  /** How many agents are using it */
  adoptionCount: number;

  /** Viral coefficient - how quickly it spreads */
  virality: number;

  /** Current popularity 0-100 */
  popularity: number;

  /** Peak popularity reached */
  peakPopularity: number;

  /** Status */
  status: 'emerging' | 'trending' | 'mainstream' | 'classic' | 'forgotten';
}

export interface FashionTrend {
  id: string;
  name: string;
  description: string;
  originShowId: string;
  originCharacter?: string;
  createdTick: number;

  /** What the trend involves */
  elements: FashionElement[];

  /** Adoption metrics */
  adoptionCount: number;
  popularity: number;
  peakPopularity: number;

  /** Status */
  status: 'cutting_edge' | 'trendy' | 'mainstream' | 'dated' | 'retro';
}

export interface FashionElement {
  type: 'hairstyle' | 'clothing' | 'accessory' | 'color_palette' | 'style';
  name: string;
  description: string;
}

export interface FanCommunity {
  id: string;
  name: string;
  showId: string;
  createdTick: number;

  /** Members (agent IDs) */
  members: Set<string>;
  leaders: string[];

  /** Activity level */
  activityLevel: number; // 0-100
  weeklyGrowthRate: number;

  /** Community characteristics */
  fanaticism: number; // 0-100, how intense the fandom is
  creativity: number; // Fan works, theories
  toxicity: number; // 0-100, negative behavior

  /** Created content */
  fanTheories: FanTheory[];
  fanWorks: number;
  conventions: number;
}

export interface FanTheory {
  id: string;
  title: string;
  description: string;
  authorId: string;
  createdTick: number;
  beliefCount: number;
  confirmed: boolean;
}

export interface Celebrity {
  id: string;
  agentId: string;
  agentName: string;

  /** Fame metrics */
  fameLevel: number; // 0-100
  peakFame: number;
  fansCount: number;

  /** Recognition */
  knownForShows: string[];
  knownForCharacters: string[];
  signatureCatchphrases: string[];

  /** Public perception */
  publicApproval: number; // -100 to 100
  controversies: number;
  awards: string[];

  /** Status */
  status: 'rising_star' | 'a_list' | 'b_list' | 'has_been' | 'legendary';
}

export interface IconicMoment {
  id: string;
  showId: string;
  episodeNumber: number;
  description: string;
  occurredTick: number;

  /** What made it iconic */
  category: 'twist' | 'quote' | 'scene' | 'finale' | 'premiere' | 'death' | 'romance';

  /** Cultural penetration */
  recognitionScore: number; // 0-100
  referencedCount: number;

  /** Associated elements */
  catchphraseId?: string;
  characterInvolved: string[];
}

// ============================================================================
// CULTURAL IMPACT MANAGER
// ============================================================================

export class CulturalImpactManager {
  private events: SystemEventManager | null = null;

  private catchphrases: Map<string, Catchphrase> = new Map();
  private fashionTrends: Map<string, FashionTrend> = new Map();
  private fanCommunities: Map<string, FanCommunity> = new Map();
  private celebrities: Map<string, Celebrity> = new Map();
  private iconicMoments: Map<string, IconicMoment> = new Map();

  /** Track which agents have adopted which cultural elements */
  private agentCatchphrases: Map<string, Set<string>> = new Map();
  private agentFashion: Map<string, Set<string>> = new Map();

  setEventBus(eventBus: EventBus): void {
    this.events = new SystemEventManager(eventBus, 'CulturalImpactManager');
  }

  // ============================================================================
  // CATCHPHRASE MANAGEMENT
  // ============================================================================

  registerCatchphrase(
    phrase: string,
    showId: string,
    character: string,
    currentTick: number
  ): Catchphrase {
    const catchphrase: Catchphrase = {
      id: `phrase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      phrase,
      originShowId: showId,
      originCharacter: character,
      createdTick: currentTick,
      adoptionCount: 0,
      virality: 0.5 + Math.random() * 0.5, // 0.5-1.0
      popularity: 10,
      peakPopularity: 10,
      status: 'emerging',
    };

    this.catchphrases.set(catchphrase.id, catchphrase);

    this.events?.emitGeneric('tv:culture:catchphrase_created', {
      catchphraseId: catchphrase.id,
      phrase,
      character,
    }, showId);

    return catchphrase;
  }

  /**
   * Agent adopts a catchphrase, creating a STRONG episodic memory
   *
   * Like "Did I do that?" from Steve Urkel, catchphrases create memories
   * that stick with agents for decades. High emotional intensity + social
   * significance + novelty = memories that resist decay.
   *
   * @param agentId - The agent adopting the catchphrase
   * @param catchphraseId - The catchphrase being adopted
   * @param agentEntity - Optional: the agent's Entity for memory creation
   * @param currentTick - Optional: current game tick for timestamp
   */
  agentAdoptsCatchphrase(
    agentId: string,
    catchphraseId: string,
    agentEntity?: Entity,
    currentTick?: number
  ): boolean {
    const catchphrase = this.catchphrases.get(catchphraseId);
    if (!catchphrase) return false;

    let agentPhrases = this.agentCatchphrases.get(agentId);
    if (!agentPhrases) {
      agentPhrases = new Set();
      this.agentCatchphrases.set(agentId, agentPhrases);
    }

    if (agentPhrases.has(catchphraseId)) return false; // Already adopted

    agentPhrases.add(catchphraseId);
    catchphrase.adoptionCount++;
    catchphrase.popularity = Math.min(100, catchphrase.popularity + catchphrase.virality);

    if (catchphrase.popularity > catchphrase.peakPopularity) {
      catchphrase.peakPopularity = catchphrase.popularity;
    }

    this.updateCatchphraseStatus(catchphrase);

    // Create a STRONG episodic memory for the catchphrase
    // These memories resist decay and stay with agents like real TV catchphrases
    if (agentEntity) {
      this.createCatchphraseMemory(agentEntity, catchphrase, currentTick ?? Date.now());
    }

    return true;
  }

  /**
   * Create a strong, lasting episodic memory for a catchphrase
   *
   * Catchphrase memories are special:
   * - High emotional intensity (0.7-0.9) - they're funny/memorable
   * - High social significance (0.8) - shared cultural touchstone
   * - High novelty (0.8) - the phrase is distinctive
   * - Positive emotional valence (0.6) - usually associated with humor
   *
   * This creates memories with importance ~0.7+, which decay VERY slowly
   * and will be recalled for decades of game time.
   */
  private createCatchphraseMemory(
    agentEntity: Entity,
    catchphrase: Catchphrase,
    currentTick: number
  ): void {
    const memoryComponent = agentEntity.getComponent('episodic_memory') as EpisodicMemoryComponent | null;
    if (!memoryComponent) return;

    // Calculate emotional intensity based on catchphrase virality and popularity
    // More viral = funnier = more emotionally impactful
    const emotionalIntensity = 0.7 + (catchphrase.virality * 0.2); // 0.7-0.9

    memoryComponent.formMemory({
      eventType: 'tv:catchphrase_learned',
      summary: `Heard "${catchphrase.phrase}" from ${catchphrase.originCharacter} and it stuck with me`,
      timestamp: currentTick,
      emotionalValence: 0.6, // Positive - catchphrases are usually fun
      emotionalIntensity, // High - these memories are vivid
      surprise: 0.5 + (catchphrase.virality * 0.3), // Surprising element to the phrase
      novelty: 0.8, // Distinctive and new
      socialSignificance: 0.8, // Shared cultural experience
      goalRelevance: 0.2, // Low direct goal relevance
      survivalRelevance: 0.0, // No survival relevance
      // High importance will be calculated from these factors:
      // ~0.8 * 0.25 (emotion) + 0.8 * 0.25 (novelty) + 0.8 * 0.125 (social) = ~0.5+ base
      // Plus it's marked for consolidation so it resists decay
      markedForConsolidation: true, // This memory should be consolidated to long-term
      dialogueText: `"${catchphrase.phrase}"`,
    });

    this.events?.emitGeneric('tv:culture:catchphrase_memory_formed', {
      agentId: agentEntity.id,
      phrase: catchphrase.phrase,
      character: catchphrase.originCharacter,
      showId: catchphrase.originShowId,
    }, agentEntity.id);
  }

  private updateCatchphraseStatus(catchphrase: Catchphrase): void {
    if (catchphrase.popularity >= 80) {
      catchphrase.status = 'mainstream';
    } else if (catchphrase.popularity >= 50) {
      catchphrase.status = 'trending';
    } else if (catchphrase.popularity >= 20) {
      catchphrase.status = 'emerging';
    } else if (catchphrase.peakPopularity >= 50) {
      catchphrase.status = 'classic';
    } else {
      catchphrase.status = 'forgotten';
    }
  }

  spreadCatchphrases(decayRate: number = 0.1): void {
    for (const catchphrase of this.catchphrases.values()) {
      // Natural decay
      catchphrase.popularity = Math.max(0, catchphrase.popularity - decayRate);
      this.updateCatchphraseStatus(catchphrase);
    }
  }

  getAgentCatchphrases(agentId: string): Catchphrase[] {
    const phraseIds = this.agentCatchphrases.get(agentId);
    if (!phraseIds) return [];

    return Array.from(phraseIds)
      .map(id => this.catchphrases.get(id))
      .filter((p): p is Catchphrase => p !== undefined);
  }

  getTrendingCatchphrases(limit: number = 10): Catchphrase[] {
    return Array.from(this.catchphrases.values())
      .filter(p => p.status === 'trending' || p.status === 'mainstream')
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
  }

  // ============================================================================
  // FASHION TRENDS
  // ============================================================================

  createFashionTrend(
    name: string,
    description: string,
    showId: string,
    elements: FashionElement[],
    currentTick: number,
    character?: string
  ): FashionTrend {
    const trend: FashionTrend = {
      id: `trend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      originShowId: showId,
      originCharacter: character,
      createdTick: currentTick,
      elements,
      adoptionCount: 0,
      popularity: 5,
      peakPopularity: 5,
      status: 'cutting_edge',
    };

    this.fashionTrends.set(trend.id, trend);

    this.events?.emitGeneric('tv:culture:fashion_trend_created', {
      trendId: trend.id,
      name,
      elements: elements.length,
    }, showId);

    return trend;
  }

  agentAdoptsFashion(agentId: string, trendId: string): boolean {
    const trend = this.fashionTrends.get(trendId);
    if (!trend) return false;

    let agentTrends = this.agentFashion.get(agentId);
    if (!agentTrends) {
      agentTrends = new Set();
      this.agentFashion.set(agentId, agentTrends);
    }

    if (agentTrends.has(trendId)) return false;

    agentTrends.add(trendId);
    trend.adoptionCount++;
    trend.popularity = Math.min(100, trend.popularity + 2);

    if (trend.popularity > trend.peakPopularity) {
      trend.peakPopularity = trend.popularity;
    }

    this.updateFashionStatus(trend);
    return true;
  }

  private updateFashionStatus(trend: FashionTrend): void {
    if (trend.popularity >= 70) {
      trend.status = 'mainstream';
    } else if (trend.popularity >= 40) {
      trend.status = 'trendy';
    } else if (trend.popularity >= 10) {
      trend.status = 'cutting_edge';
    } else if (trend.peakPopularity >= 50) {
      trend.status = 'retro';
    } else {
      trend.status = 'dated';
    }
  }

  // ============================================================================
  // FAN COMMUNITIES
  // ============================================================================

  createFanCommunity(
    name: string,
    showId: string,
    founderId: string,
    currentTick: number
  ): FanCommunity {
    const community: FanCommunity = {
      id: `fandom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      showId,
      createdTick: currentTick,
      members: new Set([founderId]),
      leaders: [founderId],
      activityLevel: 50,
      weeklyGrowthRate: 0,
      fanaticism: 30,
      creativity: 50,
      toxicity: 10,
      fanTheories: [],
      fanWorks: 0,
      conventions: 0,
    };

    this.fanCommunities.set(community.id, community);

    this.events?.emitGeneric('tv:culture:fandom_created', {
      communityId: community.id,
      name,
      founderId,
    }, showId);

    return community;
  }

  joinFanCommunity(communityId: string, agentId: string): boolean {
    const community = this.fanCommunities.get(communityId);
    if (!community || community.members.has(agentId)) return false;

    community.members.add(agentId);
    community.weeklyGrowthRate = (community.weeklyGrowthRate * 0.9) + 0.1;

    return true;
  }

  leaveFanCommunity(communityId: string, agentId: string): boolean {
    const community = this.fanCommunities.get(communityId);
    if (!community || !community.members.has(agentId)) return false;

    community.members.delete(agentId);
    community.leaders = community.leaders.filter(l => l !== agentId);

    return true;
  }

  addFanTheory(
    communityId: string,
    title: string,
    description: string,
    authorId: string,
    currentTick: number
  ): FanTheory | null {
    const community = this.fanCommunities.get(communityId);
    if (!community) return null;

    const theory: FanTheory = {
      id: `theory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      authorId,
      createdTick: currentTick,
      beliefCount: 1,
      confirmed: false,
    };

    community.fanTheories.push(theory);
    community.creativity = Math.min(100, community.creativity + 2);

    this.events?.emitGeneric('tv:culture:fan_theory_created', {
      communityId,
      theoryId: theory.id,
      title,
      authorId,
    }, community.showId);

    return theory;
  }

  confirmFanTheory(communityId: string, theoryId: string): boolean {
    const community = this.fanCommunities.get(communityId);
    if (!community) return false;

    const theory = community.fanTheories.find(t => t.id === theoryId);
    if (!theory || theory.confirmed) return false;

    theory.confirmed = true;
    community.fanaticism = Math.min(100, community.fanaticism + 10);

    this.events?.emitGeneric('tv:culture:fan_theory_confirmed', {
      communityId,
      theoryId,
      title: theory.title,
    }, community.showId);

    return true;
  }

  // ============================================================================
  // CELEBRITY STATUS
  // ============================================================================

  createCelebrity(
    agentId: string,
    agentName: string,
    initialShowId: string,
    characterName: string
  ): Celebrity {
    const celebrity: Celebrity = {
      id: `celeb_${agentId}`,
      agentId,
      agentName,
      fameLevel: 20,
      peakFame: 20,
      fansCount: 0,
      knownForShows: [initialShowId],
      knownForCharacters: [characterName],
      signatureCatchphrases: [],
      publicApproval: 50,
      controversies: 0,
      awards: [],
      status: 'rising_star',
    };

    this.celebrities.set(celebrity.id, celebrity);

    this.events?.emitGeneric('tv:culture:celebrity_emerged', {
      celebrityId: celebrity.id,
      agentName,
      showId: initialShowId,
      characterName,
    }, agentId);

    return celebrity;
  }

  increaseFame(celebrityId: string, amount: number, reason: string): boolean {
    const celebrity = this.celebrities.get(celebrityId);
    if (!celebrity) return false;

    celebrity.fameLevel = Math.min(100, celebrity.fameLevel + amount);

    if (celebrity.fameLevel > celebrity.peakFame) {
      celebrity.peakFame = celebrity.fameLevel;
    }

    this.updateCelebrityStatus(celebrity);

    this.events?.emitGeneric('tv:culture:fame_increased', {
      celebrityId,
      agentName: celebrity.agentName,
      newFameLevel: celebrity.fameLevel,
      reason,
    }, celebrity.agentId);

    return true;
  }

  private updateCelebrityStatus(celebrity: Celebrity): void {
    if (celebrity.fameLevel >= 90) {
      celebrity.status = celebrity.peakFame >= 90 && celebrity.fameLevel < celebrity.peakFame * 0.7
        ? 'legendary'
        : 'a_list';
    } else if (celebrity.fameLevel >= 60) {
      celebrity.status = 'a_list';
    } else if (celebrity.fameLevel >= 30) {
      celebrity.status = 'b_list';
    } else if (celebrity.peakFame >= 60) {
      celebrity.status = 'has_been';
    } else {
      celebrity.status = 'rising_star';
    }
  }

  addAward(celebrityId: string, award: string): boolean {
    const celebrity = this.celebrities.get(celebrityId);
    if (!celebrity) return false;

    celebrity.awards.push(award);
    celebrity.fameLevel = Math.min(100, celebrity.fameLevel + 5);
    celebrity.publicApproval = Math.min(100, celebrity.publicApproval + 3);
    this.updateCelebrityStatus(celebrity);

    return true;
  }

  addControversy(celebrityId: string, severity: number): boolean {
    const celebrity = this.celebrities.get(celebrityId);
    if (!celebrity) return false;

    celebrity.controversies++;
    celebrity.publicApproval = Math.max(-100, celebrity.publicApproval - severity);

    // Controversies can actually increase fame (infamy)
    celebrity.fameLevel = Math.min(100, celebrity.fameLevel + severity * 0.3);

    return true;
  }

  getCelebrity(agentId: string): Celebrity | undefined {
    return this.celebrities.get(`celeb_${agentId}`);
  }

  getTopCelebrities(limit: number = 10): Celebrity[] {
    return Array.from(this.celebrities.values())
      .sort((a, b) => b.fameLevel - a.fameLevel)
      .slice(0, limit);
  }

  // ============================================================================
  // ICONIC MOMENTS
  // ============================================================================

  /**
   * Record an iconic TV moment - creates strong memories for viewers
   *
   * Iconic moments like the "Who shot J.R.?" cliffhanger or the final episode
   * of MASH create memories that last lifetimes. Viewers who watch these
   * moments form strong episodic memories with:
   * - High emotional intensity (based on category)
   * - High surprise (for twists/deaths)
   * - High social significance (shared cultural experience)
   */
  recordIconicMoment(
    showId: string,
    episodeNumber: number,
    description: string,
    category: IconicMoment['category'],
    characters: string[],
    currentTick: number,
    viewers?: Entity[]
  ): IconicMoment {
    const moment: IconicMoment = {
      id: `moment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      showId,
      episodeNumber,
      description,
      occurredTick: currentTick,
      category,
      recognitionScore: 20,
      referencedCount: 0,
      characterInvolved: characters,
    };

    this.iconicMoments.set(moment.id, moment);

    // Create memories for all viewers who witnessed this moment
    if (viewers) {
      for (const viewer of viewers) {
        this.createIconicMomentMemory(viewer, moment, currentTick);
      }
    }

    this.events?.emitGeneric('tv:culture:iconic_moment', {
      momentId: moment.id,
      description,
      category,
      characters,
    }, showId);

    return moment;
  }

  /**
   * Create a strong episodic memory for an iconic TV moment
   *
   * Different categories create different types of memories:
   * - 'twist': High surprise, moderate positive emotion
   * - 'death': High emotion (negative), high surprise
   * - 'romance': High positive emotion, moderate surprise
   * - 'finale': Very high emotion, mixed valence (bittersweet)
   * - 'quote': Moderate emotion, high novelty (like catchphrases)
   */
  private createIconicMomentMemory(
    viewerEntity: Entity,
    moment: IconicMoment,
    currentTick: number
  ): void {
    const memoryComponent = viewerEntity.getComponent('episodic_memory') as EpisodicMemoryComponent | null;
    if (!memoryComponent) return;

    // Category-specific emotional properties
    const emotionByCategory: Record<IconicMoment['category'], {
      valence: number;
      intensity: number;
      surprise: number;
    }> = {
      twist: { valence: 0.3, intensity: 0.85, surprise: 0.95 },
      quote: { valence: 0.6, intensity: 0.7, surprise: 0.5 },
      scene: { valence: 0.4, intensity: 0.75, surprise: 0.6 },
      finale: { valence: 0.2, intensity: 0.9, surprise: 0.4 }, // Bittersweet
      premiere: { valence: 0.7, intensity: 0.7, surprise: 0.6 },
      death: { valence: -0.6, intensity: 0.95, surprise: 0.85 },
      romance: { valence: 0.8, intensity: 0.8, surprise: 0.5 },
    };

    const emotions = emotionByCategory[moment.category];

    memoryComponent.formMemory({
      eventType: 'tv:iconic_moment_witnessed',
      summary: `Witnessed "${moment.description}" - a ${moment.category} moment that everyone's talking about`,
      timestamp: currentTick,
      emotionalValence: emotions.valence,
      emotionalIntensity: emotions.intensity,
      surprise: emotions.surprise,
      novelty: 0.9, // Iconic moments are by definition novel
      socialSignificance: 0.9, // Everyone's talking about it
      goalRelevance: 0.1,
      survivalRelevance: 0.0,
      markedForConsolidation: true, // These memories should persist
    });
  }

  referenceMoment(momentId: string): boolean {
    const moment = this.iconicMoments.get(momentId);
    if (!moment) return false;

    moment.referencedCount++;
    moment.recognitionScore = Math.min(100, moment.recognitionScore + 1);

    return true;
  }

  getMostIconicMoments(showId?: string, limit: number = 10): IconicMoment[] {
    let moments = Array.from(this.iconicMoments.values());

    if (showId) {
      moments = moments.filter(m => m.showId === showId);
    }

    return moments
      .sort((a, b) => b.recognitionScore - a.recognitionScore)
      .slice(0, limit);
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  cleanup(): void {
    this.catchphrases.clear();
    this.fashionTrends.clear();
    this.fanCommunities.clear();
    this.celebrities.clear();
    this.iconicMoments.clear();
    this.agentCatchphrases.clear();
    this.agentFashion.clear();
    this.events?.cleanup();
    this.events = null;
  }
}

// ============================================================================
// TV CULTURAL IMPACT SYSTEM
// ============================================================================

export class TVCulturalImpactSystem extends BaseSystem {
  readonly id = 'TVCulturalImpactSystem';
  readonly priority = 75;
  readonly requiredComponents = [ComponentType.TVStation] as const;

  private manager = new CulturalImpactManager();

  protected readonly throttleInterval = 20 * 60 * 5; // Every 5 minutes

  protected onInitialize(_world: World, eventBus: EventBus): void {
    this.manager.setEventBus(eventBus);
  }

  getManager(): CulturalImpactManager {
    return this.manager;
  }

  protected onUpdate(_ctx: SystemContext): void {
    // Decay catchphrase popularity over time
    this.manager.spreadCatchphrases(0.5);
  }

  protected onCleanup(): void {
    this.manager.cleanup();
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let culturalImpactSystemInstance: TVCulturalImpactSystem | null = null;

export function getTVCulturalImpactSystem(): TVCulturalImpactSystem {
  if (!culturalImpactSystemInstance) {
    culturalImpactSystemInstance = new TVCulturalImpactSystem();
  }
  return culturalImpactSystemInstance;
}

export function resetTVCulturalImpactSystem(): void {
  if (culturalImpactSystemInstance) {
    culturalImpactSystemInstance.cleanup();
  }
  culturalImpactSystemInstance = null;
}
