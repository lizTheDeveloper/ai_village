/**
 * SoapOperaSystem - Serialized drama management
 *
 * Handles:
 * - Long-running storyline management
 * - Character relationship webs
 * - Plot twist scheduling
 * - Dramatic tension tracking
 * - Cliffhanger generation
 * - Cross-storyline integration
 */

import type { World } from '../../ecs/World.js';
import type { Entity } from '../../ecs/Entity.js';
import type { System } from '../../ecs/System.js';
import type { EventBus } from '../../events/EventBus.js';
import { SystemEventManager } from '../../events/TypedEventEmitter.js';
import { ComponentType } from '../../types/ComponentType.js';
import type { Storyline, PlotTwist, StorylineTheme, ShowCharacter } from '../TVShow.js';

// ============================================================================
// SOAP OPERA TYPES
// ============================================================================

export type DramaticTone =
  | 'romantic'         // Love and relationships
  | 'suspenseful'      // Mystery and tension
  | 'comedic'          // Lighter moments
  | 'tragic'           // Death, loss, heartbreak
  | 'confrontational'  // Arguments and fights
  | 'revelatory';      // Secrets exposed

export type RelationshipType =
  | 'married'
  | 'dating'
  | 'engaged'
  | 'divorced'
  | 'affair'
  | 'ex'
  | 'siblings'
  | 'parent_child'
  | 'rivals'
  | 'best_friends'
  | 'enemies'
  | 'unrequited_love'
  | 'secret_relatives';

export interface CharacterRelationship {
  character1: string;
  character2: string;
  type: RelationshipType;
  intensity: number; // 0-100, how dramatic/central this relationship is
  secret: boolean; // Is this relationship hidden from other characters?
  startEpisode: number;
  endEpisode?: number;
  history: RelationshipEvent[];
}

export interface RelationshipEvent {
  episodeNumber: number;
  event: string;
  emotionalImpact: number; // -100 to 100
}

export interface SoapEpisode {
  id: string;
  showId: string;
  episodeNumber: number;

  /** Scenes in this episode */
  scenes: SoapScene[];

  /** Which storylines are advanced */
  storylinesAdvanced: string[];

  /** Dramatic elements */
  tone: DramaticTone;
  tensionLevel: number; // 0-100
  cliffhangerEnding: boolean;
  cliffhangerDescription?: string;

  /** Execution status */
  status: 'planning' | 'scripted' | 'filmed' | 'aired';
  airedTick?: number;

  /** Viewer reaction */
  viewerEngagement?: number;
  socialMediaBuzz?: number;
}

export interface SoapScene {
  id: string;
  location: string;
  characters: string[];
  storylineId?: string;

  /** Scene content */
  description: string;
  dialogue: SceneDialogue[];
  action: string;

  /** Dramatic elements */
  tone: DramaticTone;
  emotionalBeats: EmotionalBeat[];
  revelationMade?: string;

  /** Duration in minutes */
  durationMinutes: number;
}

export interface SceneDialogue {
  character: string;
  line: string;
  subtext?: string; // What they really mean
  emotion: string;
}

export interface EmotionalBeat {
  moment: string;
  emotion: string;
  intensity: number; // 0-10
  characters: string[];
}

// ============================================================================
// STORYLINE TRACKING
// ============================================================================

export interface StorylineProgress {
  storylineId: string;
  currentPhase: 'setup' | 'rising_action' | 'climax' | 'falling_action' | 'resolution';
  episodesRemaining: number;
  audienceInvestment: number; // 0-100, how much viewers care
  complications: string[];
  scheduledReveals: string[];
}

export interface StoryArc {
  id: string;
  showId: string;
  title: string;
  mainStorylines: string[];
  supportingStorylines: string[];
  overarchingTheme: StorylineTheme;
  startEpisode: number;
  expectedEndEpisode: number;
  status: 'active' | 'completed' | 'extended';
}

// ============================================================================
// SOAP OPERA MANAGER
// ============================================================================

export class SoapOperaManager {
  private events: SystemEventManager | null = null;

  /** Show storylines */
  private storylines: Map<string, Storyline> = new Map();
  private storylineProgress: Map<string, StorylineProgress> = new Map();

  /** Character relationships */
  private relationships: Map<string, CharacterRelationship> = new Map();

  /** Story arcs */
  private storyArcs: Map<string, StoryArc> = new Map();

  /** Episodes */
  private episodes: Map<string, SoapEpisode> = new Map();

  /** Pending plot twists */
  private pendingTwists: Map<string, PlotTwist> = new Map();

  /** Character drama scores - tracks who's been in too much/little drama */
  private characterDramaScores: Map<string, number> = new Map();

  setEventBus(eventBus: EventBus): void {
    this.events = new SystemEventManager(eventBus, 'SoapOperaManager');
  }

  // ============================================================================
  // STORYLINE MANAGEMENT
  // ============================================================================

  createStoryline(
    showId: string,
    title: string,
    characters: string[],
    themes: StorylineTheme[],
    expectedDuration: number,
    startEpisode: number
  ): Storyline {
    const storyline: Storyline = {
      id: `storyline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      characters,
      plot: '', // To be generated
      status: 'ongoing',
      startEpisode,
      expectedDuration,
      themes,
      emotionalIntensity: 5,
    };

    this.storylines.set(storyline.id, storyline);

    // Initialize progress tracking
    this.storylineProgress.set(storyline.id, {
      storylineId: storyline.id,
      currentPhase: 'setup',
      episodesRemaining: expectedDuration,
      audienceInvestment: 30, // Start at moderate interest
      complications: [],
      scheduledReveals: [],
    });

    // Update drama scores for involved characters
    for (const char of characters) {
      const current = this.characterDramaScores.get(char) ?? 0;
      this.characterDramaScores.set(char, current + themes.length * 10);
    }

    this.events?.emitGeneric('tv:soap:storyline_created', {
      storylineId: storyline.id,
      title,
      characters,
      themes,
      expectedDuration,
    }, showId);

    return storyline;
  }

  advanceStoryline(storylineId: string, episodeNumber: number): StorylineProgress | null {
    const storyline = this.storylines.get(storylineId);
    const progress = this.storylineProgress.get(storylineId);

    if (!storyline || !progress) return null;

    progress.episodesRemaining--;

    // Advance phase based on progress
    const totalEpisodes = storyline.expectedDuration;
    const elapsed = totalEpisodes - progress.episodesRemaining;
    const percentComplete = elapsed / totalEpisodes;

    if (percentComplete < 0.2) {
      progress.currentPhase = 'setup';
    } else if (percentComplete < 0.5) {
      progress.currentPhase = 'rising_action';
    } else if (percentComplete < 0.7) {
      progress.currentPhase = 'climax';
    } else if (percentComplete < 0.9) {
      progress.currentPhase = 'falling_action';
    } else {
      progress.currentPhase = 'resolution';
    }

    // Check for completion
    if (progress.episodesRemaining <= 0) {
      storyline.status = 'resolved';

      this.events?.emitGeneric('tv:soap:storyline_resolved', {
        storylineId,
        title: storyline.title,
        episodeNumber,
        audienceInvestment: progress.audienceInvestment,
      }, storyline.id);
    }

    return progress;
  }

  addComplication(storylineId: string, complication: string): boolean {
    const progress = this.storylineProgress.get(storylineId);
    const storyline = this.storylines.get(storylineId);

    if (!progress || !storyline) return false;

    progress.complications.push(complication);
    progress.episodesRemaining += 2; // Complications extend storylines
    storyline.emotionalIntensity = Math.min(10, storyline.emotionalIntensity + 1);

    this.events?.emitGeneric('tv:soap:complication_added', {
      storylineId,
      complication,
      newDuration: progress.episodesRemaining,
    }, storylineId);

    return true;
  }

  scheduleReveal(storylineId: string, reveal: string, episodeNumber: number): boolean {
    const progress = this.storylineProgress.get(storylineId);
    if (!progress) return false;

    progress.scheduledReveals.push(`E${episodeNumber}: ${reveal}`);
    return true;
  }

  // ============================================================================
  // RELATIONSHIP MANAGEMENT
  // ============================================================================

  createRelationship(
    showId: string,
    char1: string,
    char2: string,
    type: RelationshipType,
    startEpisode: number,
    secret: boolean = false
  ): CharacterRelationship {
    const key = this.getRelationshipKey(char1, char2);

    const relationship: CharacterRelationship = {
      character1: char1,
      character2: char2,
      type,
      intensity: 50,
      secret,
      startEpisode,
      history: [],
    };

    this.relationships.set(key, relationship);

    this.events?.emitGeneric('tv:soap:relationship_created', {
      characters: [char1, char2],
      type,
      secret,
      startEpisode,
    }, showId);

    return relationship;
  }

  updateRelationship(
    char1: string,
    char2: string,
    newType?: RelationshipType,
    intensityChange?: number
  ): CharacterRelationship | null {
    const key = this.getRelationshipKey(char1, char2);
    const relationship = this.relationships.get(key);

    if (!relationship) return null;

    if (newType) {
      relationship.type = newType;
    }

    if (intensityChange) {
      relationship.intensity = Math.max(0, Math.min(100, relationship.intensity + intensityChange));
    }

    return relationship;
  }

  addRelationshipEvent(
    char1: string,
    char2: string,
    episodeNumber: number,
    event: string,
    emotionalImpact: number
  ): boolean {
    const key = this.getRelationshipKey(char1, char2);
    const relationship = this.relationships.get(key);

    if (!relationship) return false;

    relationship.history.push({
      episodeNumber,
      event,
      emotionalImpact,
    });

    // Intensity changes based on impact
    relationship.intensity = Math.max(0, Math.min(100,
      relationship.intensity + Math.abs(emotionalImpact) / 10
    ));

    return true;
  }

  revealSecretRelationship(char1: string, char2: string, episodeNumber: number): boolean {
    const key = this.getRelationshipKey(char1, char2);
    const relationship = this.relationships.get(key);

    if (!relationship || !relationship.secret) return false;

    relationship.secret = false;

    this.events?.emitGeneric('tv:soap:secret_revealed', {
      characters: [char1, char2],
      relationshipType: relationship.type,
      episodeNumber,
    }, 'relationship');

    return true;
  }

  getCharacterRelationships(character: string): CharacterRelationship[] {
    const relationships: CharacterRelationship[] = [];

    for (const rel of this.relationships.values()) {
      if (rel.character1 === character || rel.character2 === character) {
        relationships.push(rel);
      }
    }

    return relationships;
  }

  private getRelationshipKey(char1: string, char2: string): string {
    // Consistent ordering for lookup
    return [char1, char2].sort().join('_');
  }

  // ============================================================================
  // PLOT TWIST MANAGEMENT
  // ============================================================================

  schedulePlotTwist(
    showId: string,
    twist: Omit<PlotTwist, 'executed'>
  ): PlotTwist {
    const fullTwist: PlotTwist = {
      ...twist,
      executed: false,
    };

    const twistId = `twist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.pendingTwists.set(twistId, fullTwist);

    this.events?.emitGeneric('tv:soap:twist_scheduled', {
      twistId,
      type: twist.type,
      impact: twist.impact,
      scheduledEpisode: twist.scheduledEpisode,
      affectedCharacters: twist.affectedCharacters,
    }, showId);

    return fullTwist;
  }

  executePlotTwist(twistId: string, episodeNumber: number): PlotTwist | null {
    const twist = this.pendingTwists.get(twistId);
    if (!twist || twist.executed) return null;

    twist.executed = true;

    // Update drama scores for affected characters
    const impactScore = { minor: 10, major: 25, shocking: 50 };
    for (const char of twist.affectedCharacters) {
      const current = this.characterDramaScores.get(char) ?? 0;
      this.characterDramaScores.set(char, current + impactScore[twist.impact]);
    }

    this.events?.emitGeneric('tv:soap:twist_executed', {
      twistId,
      type: twist.type,
      impact: twist.impact,
      episodeNumber,
      affectedCharacters: twist.affectedCharacters,
    }, twistId);

    return twist;
  }

  getPendingTwists(episodeNumber?: number): PlotTwist[] {
    const twists = Array.from(this.pendingTwists.values()).filter(t => !t.executed);

    if (episodeNumber !== undefined) {
      return twists.filter(t => t.scheduledEpisode === episodeNumber);
    }

    return twists;
  }

  // ============================================================================
  // EPISODE GENERATION
  // ============================================================================

  planEpisode(
    showId: string,
    episodeNumber: number,
    activeStorylines: string[]
  ): SoapEpisode {
    // Determine which storylines to advance
    const storylinesToAdvance = this.selectStorylinesToAdvance(activeStorylines, episodeNumber);

    // Determine tone based on storylines
    const tone = this.determineEpisodeTone(storylinesToAdvance);

    // Check for cliffhanger (every 5th episode, or before breaks)
    const isCliffhanger = episodeNumber % 5 === 0;

    const episode: SoapEpisode = {
      id: `soap_ep_${showId}_${episodeNumber}`,
      showId,
      episodeNumber,
      scenes: [],
      storylinesAdvanced: storylinesToAdvance,
      tone,
      tensionLevel: this.calculateTensionLevel(storylinesToAdvance),
      cliffhangerEnding: isCliffhanger,
      status: 'planning',
    };

    // Generate scenes
    episode.scenes = this.generateScenes(episode, storylinesToAdvance);

    // Generate cliffhanger if needed
    if (isCliffhanger) {
      episode.cliffhangerDescription = this.generateCliffhanger(storylinesToAdvance);
    }

    this.episodes.set(episode.id, episode);

    this.events?.emitGeneric('tv:soap:episode_planned', {
      episodeId: episode.id,
      episodeNumber,
      storylinesAdvanced: storylinesToAdvance.length,
      sceneCount: episode.scenes.length,
      tone,
      isCliffhanger,
    }, showId);

    return episode;
  }

  private selectStorylinesToAdvance(storylineIds: string[], _episodeNumber: number): string[] {
    // Select 2-4 storylines to advance per episode
    const storylines = storylineIds
      .map(id => ({ id, progress: this.storylineProgress.get(id) }))
      .filter(s => s.progress && s.progress.episodesRemaining > 0);

    // Prioritize storylines at climax or with scheduled reveals
    storylines.sort((a, b) => {
      const phaseOrder = { climax: 0, rising_action: 1, falling_action: 2, resolution: 3, setup: 4 };
      return phaseOrder[a.progress!.currentPhase] - phaseOrder[b.progress!.currentPhase];
    });

    return storylines.slice(0, Math.min(4, storylines.length)).map(s => s.id);
  }

  private determineEpisodeTone(storylineIds: string[]): DramaticTone {
    const themes: StorylineTheme[] = [];

    for (const id of storylineIds) {
      const storyline = this.storylines.get(id);
      if (storyline) {
        themes.push(...storyline.themes);
      }
    }

    // Map themes to tones
    if (themes.includes('murder_mystery') || themes.includes('revenge')) return 'suspenseful';
    if (themes.includes('betrayal') || themes.includes('secret')) return 'revelatory';
    if (themes.includes('romance') || themes.includes('forbidden_love')) return 'romantic';
    if (themes.includes('family_drama')) return 'confrontational';

    return 'romantic'; // Default for soaps
  }

  private calculateTensionLevel(storylineIds: string[]): number {
    let totalTension = 0;

    for (const id of storylineIds) {
      const storyline = this.storylines.get(id);
      const progress = this.storylineProgress.get(id);

      if (storyline && progress) {
        // Tension peaks at climax
        const phaseMultiplier: Record<string, number> = {
          setup: 0.3,
          rising_action: 0.6,
          climax: 1.0,
          falling_action: 0.5,
          resolution: 0.2,
        };

        const multiplier = phaseMultiplier[progress.currentPhase] ?? 0.5;
        totalTension += storyline.emotionalIntensity * 10 * multiplier;
      }
    }

    return Math.min(100, totalTension / storylineIds.length);
  }

  private generateScenes(episode: SoapEpisode, storylineIds: string[]): SoapScene[] {
    const scenes: SoapScene[] = [];

    // Generate 6-8 scenes per episode
    const sceneCount = 6 + Math.floor(Math.random() * 3);
    const minutesPerScene = 7; // ~7 min per scene for 45-min episode

    for (let i = 0; i < sceneCount; i++) {
      // Cycle through storylines
      const storylineId = storylineIds[i % storylineIds.length];
      const storyline = this.storylines.get(storylineId!);

      if (!storyline) continue;

      // Pick 2-3 characters from the storyline
      const characterCount = 2 + Math.floor(Math.random() * 2);
      const characters = storyline.characters.slice(0, characterCount);

      scenes.push({
        id: `scene_${episode.id}_${i}`,
        location: this.generateLocation(),
        characters,
        storylineId,
        description: `Scene advancing ${storyline.title}`,
        dialogue: [],
        action: '',
        tone: episode.tone,
        emotionalBeats: [{
          moment: 'key moment',
          emotion: this.toneToEmotion(episode.tone),
          intensity: Math.ceil(episode.tensionLevel / 10),
          characters,
        }],
        durationMinutes: minutesPerScene,
      });
    }

    return scenes;
  }

  private generateLocation(): string {
    const locations = [
      'The Coffee House',
      'Hospital Room',
      'Town Square',
      'The Mansion',
      'Police Station',
      'The Restaurant',
      'Corporate Office',
      'Beach',
      'Wedding Venue',
      'Courtroom',
    ];
    return locations[Math.floor(Math.random() * locations.length)]!;
  }

  private toneToEmotion(tone: DramaticTone): string {
    const emotions: Record<DramaticTone, string> = {
      romantic: 'love',
      suspenseful: 'fear',
      comedic: 'joy',
      tragic: 'grief',
      confrontational: 'anger',
      revelatory: 'shock',
    };
    return emotions[tone];
  }

  private generateCliffhanger(_storylineIds: string[]): string {
    const cliffhangers = [
      'A shocking revelation leaves everyone speechless...',
      'An unexpected return from the past...',
      'A letter arrives with devastating news...',
      'Someone overhears a dangerous secret...',
      'A mysterious figure watches from the shadows...',
      'The wedding is interrupted by an unexpected guest...',
      'A gun fires... fade to black.',
    ];

    return cliffhangers[Math.floor(Math.random() * cliffhangers.length)]!;
  }

  // ============================================================================
  // STORY ARCS
  // ============================================================================

  createStoryArc(
    showId: string,
    title: string,
    mainStorylines: string[],
    supportingStorylines: string[],
    theme: StorylineTheme,
    startEpisode: number,
    expectedDuration: number
  ): StoryArc {
    const arc: StoryArc = {
      id: `arc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      showId,
      title,
      mainStorylines,
      supportingStorylines,
      overarchingTheme: theme,
      startEpisode,
      expectedEndEpisode: startEpisode + expectedDuration,
      status: 'active',
    };

    this.storyArcs.set(arc.id, arc);

    this.events?.emitGeneric('tv:soap:arc_created', {
      arcId: arc.id,
      title,
      theme,
      storylineCount: mainStorylines.length + supportingStorylines.length,
    }, showId);

    return arc;
  }

  // ============================================================================
  // CHARACTER BALANCE
  // ============================================================================

  /**
   * Get characters that need more screen time (low drama score)
   */
  getUnderutilizedCharacters(_showId: string, characters: ShowCharacter[]): string[] {
    const avgScore = Array.from(this.characterDramaScores.values())
      .reduce((a, b) => a + b, 0) / Math.max(1, this.characterDramaScores.size);

    return characters
      .filter(c => (this.characterDramaScores.get(c.name) ?? 0) < avgScore * 0.5)
      .map(c => c.name);
  }

  /**
   * Get characters that might need a break (high drama score)
   */
  getOverexposedCharacters(_showId: string, characters: ShowCharacter[]): string[] {
    const avgScore = Array.from(this.characterDramaScores.values())
      .reduce((a, b) => a + b, 0) / Math.max(1, this.characterDramaScores.size);

    return characters
      .filter(c => (this.characterDramaScores.get(c.name) ?? 0) > avgScore * 1.5)
      .map(c => c.name);
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  getStoryline(storylineId: string): Storyline | undefined {
    return this.storylines.get(storylineId);
  }

  getActiveStorylines(_showId: string): Storyline[] {
    return Array.from(this.storylines.values())
      .filter(s => s.status === 'ongoing');
  }

  getEpisode(episodeId: string): SoapEpisode | undefined {
    return this.episodes.get(episodeId);
  }

  getStoryArc(arcId: string): StoryArc | undefined {
    return this.storyArcs.get(arcId);
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  cleanup(): void {
    this.storylines.clear();
    this.storylineProgress.clear();
    this.relationships.clear();
    this.storyArcs.clear();
    this.episodes.clear();
    this.pendingTwists.clear();
    this.characterDramaScores.clear();
    this.events?.cleanup();
    this.events = null;
  }
}

// ============================================================================
// SOAP OPERA SYSTEM
// ============================================================================

export class SoapOperaSystem implements System {
  readonly id = 'SoapOperaSystem';
  readonly priority = 73;
  readonly requiredComponents = [ComponentType.TVStation] as const;

  private manager = new SoapOperaManager();
  private events!: SystemEventManager;

  initialize(_world: World, eventBus: EventBus): void {
    this.events = new SystemEventManager(eventBus, this.id);
    this.manager.setEventBus(eventBus);
  }

  getManager(): SoapOperaManager {
    return this.manager;
  }

  update(_world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // Soap opera system is primarily event-driven through manager calls
  }

  cleanup(): void {
    this.events.cleanup();
    this.manager.cleanup();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let soapOperaSystemInstance: SoapOperaSystem | null = null;

export function getSoapOperaSystem(): SoapOperaSystem {
  if (!soapOperaSystemInstance) {
    soapOperaSystemInstance = new SoapOperaSystem();
  }
  return soapOperaSystemInstance;
}

export function resetSoapOperaSystem(): void {
  if (soapOperaSystemInstance) {
    soapOperaSystemInstance.cleanup();
  }
  soapOperaSystemInstance = null;
}
