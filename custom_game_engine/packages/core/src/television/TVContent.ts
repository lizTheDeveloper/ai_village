/**
 * TVContent - Persistent content entities
 *
 * Content-centric architecture: Episodes, recordings, and scripts exist as
 * persistent ECS entities separate from their transmission/broadcasting.
 * Good content is archived in tiered storage (hot/warm/cold).
 */

import type { Component } from '../ecs/Component.js';

// ============================================================================
// CONTENT TYPES
// ============================================================================

export type ContentType = 'episode' | 'recording' | 'live_segment' | 'commercial' | 'promo';
export type ContentStatus = 'draft' | 'in_production' | 'post_production' | 'ready' | 'archived';
export type StorageTier = 'hot' | 'warm' | 'cold';

// ============================================================================
// SCRIPT TYPES
// ============================================================================

export interface DialogueLine {
  character: string;
  line: string;
  /** Stage direction: "(angrily)", "(whispering)" */
  direction?: string;
}

export interface Scene {
  sceneNumber: number;
  /** Location description: "INT. APARTMENT - DAY" */
  location: string;
  /** Characters in this scene */
  characters: string[];
  /** Stage directions and action */
  action: string;
  /** Dialogue lines */
  dialogue: DialogueLine[];
  /** Emotional beat: "tension rises", "revelation", "comedic relief" */
  emotionalBeat: string;
  /** What this scene accomplishes in the story */
  plotPurpose: string;
}

export interface ScriptAct {
  actNumber: number;
  scenes: Scene[];
}

export interface TVScript {
  id: string;
  showId: string;
  season: number;
  episode: number;
  title: string;

  /** Authorship */
  writers: string[]; // agent IDs
  writtenTick: number;
  revisions: number;

  /** Content */
  logline: string; // one-sentence summary
  synopsis: string; // paragraph summary
  acts: ScriptAct[];

  /** Production status */
  productionStatus: 'draft' | 'table_read' | 'shooting' | 'editing' | 'completed';
  productionNotes: string[];

  /** Budget and requirements */
  estimatedBudget: number;
  requiredSets: string[];
  requiredProps: string[];
  guestStars: string[]; // special guest appearances
}

// ============================================================================
// RECORDED CONTENT
// ============================================================================

export interface FilmedTake {
  takeNumber: number;
  sceneNumber: number;
  /** LLM-generated performance description */
  performance: string;
  /** Quality score 0-1 */
  quality: number;
  /** Director's notes on this take */
  directorNotes: string;
  timestamp: number;
}

export interface FilmedScene {
  sceneId: number;
  bestTake: FilmedTake;
  allTakes: FilmedTake[];
  /** Final quality after editing */
  editedQuality: number;
}

export interface EditedEpisode {
  id: string;
  showId: string;
  season: number;
  episodeNumber: number;
  title: string;

  /** Content */
  synopsis: string;
  scenes: FilmedScene[];

  /** Quality metrics */
  overallQuality: number; // 0-1
  actingQuality: number;
  writingQuality: number;
  productionQuality: number;

  /** Post-production */
  runtime: number; // minutes
  musicCues: string[];
  colorGrade: string;

  /** Status */
  status: ContentStatus;
  readyToAirTick: number;
}

// ============================================================================
// TV CONTENT COMPONENT
// ============================================================================

export interface TVContentComponent extends Component {
  type: 'tv_content';

  /** Content identity */
  contentId: string;
  contentType: ContentType;
  showId: string;
  title: string;

  /** Episode info (if applicable) */
  season?: number;
  episodeNumber?: number;

  /** The actual content */
  script?: TVScript;
  editedEpisode?: EditedEpisode;

  /** Quality metrics (0-1 scale) */
  qualityScore: number;
  actingScore: number;
  writingScore: number;
  productionScore: number;

  /** Cultural impact */
  culturalImpact: number; // 0-100 how much it influences village
  catchphrases: Map<string, string>; // character -> catchphrase
  memorableMoments: string[];

  /** Viewership */
  totalViews: number;
  uniqueViewers: Set<string>; // agent IDs
  averageRating: number; // 1-10 from viewers
  ratings: Map<string, number>; // viewer ID -> rating

  /** Broadcast history */
  firstAiredTick: number;
  lastAiredTick: number;
  timesAired: number;

  /** Storage */
  storageTier: StorageTier;
  archivedTick?: number;
  retrievalCost: number; // cost to retrieve from cold storage

  /** Lifecycle */
  createdTick: number;
  status: ContentStatus;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let contentIdCounter = 0;

export function createTVContentComponent(
  contentType: ContentType,
  showId: string,
  title: string,
  tick: number,
  options?: {
    season?: number;
    episodeNumber?: number;
  }
): TVContentComponent {
  return {
    type: 'tv_content',
    version: 1,
    contentId: `content_${Date.now()}_${++contentIdCounter}`,
    contentType,
    showId,
    title,
    season: options?.season,
    episodeNumber: options?.episodeNumber,

    qualityScore: 0,
    actingScore: 0,
    writingScore: 0,
    productionScore: 0,

    culturalImpact: 0,
    catchphrases: new Map(),
    memorableMoments: [],

    totalViews: 0,
    uniqueViewers: new Set(),
    averageRating: 0,
    ratings: new Map(),

    firstAiredTick: 0,
    lastAiredTick: 0,
    timesAired: 0,

    storageTier: 'hot',
    retrievalCost: 0,

    createdTick: tick,
    status: 'draft',
  };
}

export function createTVScript(
  showId: string,
  season: number,
  episode: number,
  title: string,
  writers: string[],
  tick: number
): TVScript {
  return {
    id: `script_${showId}_s${season}e${episode}_${Date.now()}`,
    showId,
    season,
    episode,
    title,
    writers,
    writtenTick: tick,
    revisions: 0,
    logline: '',
    synopsis: '',
    acts: [],
    productionStatus: 'draft',
    productionNotes: [],
    estimatedBudget: 0,
    requiredSets: [],
    requiredProps: [],
    guestStars: [],
  };
}

export function createDialogueLine(
  character: string,
  line: string,
  direction?: string
): DialogueLine {
  return {
    character,
    line,
    direction,
  };
}

export function createScene(
  sceneNumber: number,
  location: string,
  characters: string[],
  emotionalBeat: string,
  plotPurpose: string
): Scene {
  return {
    sceneNumber,
    location,
    characters,
    action: '',
    dialogue: [],
    emotionalBeat,
    plotPurpose,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function calculateOverallQuality(content: TVContentComponent): number {
  // Weighted average of quality scores
  const weights = {
    acting: 0.35,
    writing: 0.35,
    production: 0.30,
  };

  return (
    content.actingScore * weights.acting +
    content.writingScore * weights.writing +
    content.productionScore * weights.production
  );
}

export function shouldArchive(content: TVContentComponent, currentTick: number): StorageTier {
  const ticksSinceLastAired = currentTick - content.lastAiredTick;
  const ticksPerDay = 20 * 60 * 24; // 20 ticks/sec * 60 sec/min * 24 hrs (assuming 1 game minute = 1 real second)

  // Hot: Recently aired or high cultural impact
  if (ticksSinceLastAired < ticksPerDay * 7 || content.culturalImpact > 50) {
    return 'hot';
  }

  // Warm: Within last month or decent ratings
  if (ticksSinceLastAired < ticksPerDay * 30 || content.averageRating > 7) {
    return 'warm';
  }

  // Cold: Old content
  return 'cold';
}

export function updateViewership(
  content: TVContentComponent,
  viewerId: string,
  rating: number
): void {
  content.totalViews++;
  content.uniqueViewers.add(viewerId);
  content.ratings.set(viewerId, rating);

  // Recalculate average rating
  let totalRating = 0;
  content.ratings.forEach((r) => {
    totalRating += r;
  });
  content.averageRating = totalRating / content.ratings.size;
}

export function recordBroadcast(content: TVContentComponent, tick: number): void {
  if (content.firstAiredTick === 0) {
    content.firstAiredTick = tick;
  }
  content.lastAiredTick = tick;
  content.timesAired++;

  // Move to hot storage when broadcast
  content.storageTier = 'hot';
}

export function calculateRetrievalCost(tier: StorageTier): number {
  switch (tier) {
    case 'hot':
      return 0;
    case 'warm':
      return 10;
    case 'cold':
      return 50;
  }
}
