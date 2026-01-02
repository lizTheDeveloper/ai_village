/**
 * TVShow - Show configuration and metadata
 *
 * Defines the structure of TV shows: formats, cast, characters, and series arc.
 * Shows are created through the development pipeline and evolve over seasons.
 */

import type { Component } from '../ecs/Component.js';
import type { Award } from './TVStation.js';

// ============================================================================
// SHOW FORMATS
// ============================================================================

export type ShowFormat =
  | 'sitcom'          // 22-minute comedy
  | 'drama'           // 44-minute drama
  | 'soap_opera'      // Ongoing daily drama
  | 'news'            // Daily news broadcast
  | 'talk_show'       // Interview/variety
  | 'game_show'       // Competitions with contestants
  | 'reality_tv'      // Unscripted "reality"
  | 'documentary'     // Educational/informational
  | 'cooking_show'    // Food preparation
  | 'sports'          // Live sports coverage
  | 'weather'         // Weather forecasts
  | 'childrens'       // Kids programming
  | 'late_night';     // Late night comedy/talk

export type ShowStatus =
  | 'in_development'  // Pitch accepted, being written
  | 'in_production'   // Currently filming
  | 'airing'          // Actively broadcasting new episodes
  | 'hiatus'          // Between seasons
  | 'cancelled'       // Axed
  | 'completed';      // Intentionally ended

export type TargetAudience = 'children' | 'family' | 'adult' | 'mature';
export type CastRole = 'lead' | 'supporting' | 'recurring' | 'guest';

// ============================================================================
// CAST & CHARACTERS
// ============================================================================

export interface CastMember {
  agentId: string;
  characterName: string;
  role: CastRole;
  episodesAppeared: number;
  payPerEpisode: number;
  /** Contract end tick */
  contractEnd?: number;
}

export interface ShowCharacter {
  name: string;
  personality: string;
  occupation: string;
  /** Relationships to other characters: name -> relationship type */
  relationships: Map<string, string>;
  characterArc: string;
  backstory: string;
  /** Signature phrases this character uses */
  catchphrases: string[];
}

// ============================================================================
// AIR SCHEDULE
// ============================================================================

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface AirSchedule {
  day: DayOfWeek;
  hour: number; // 0-23
  minute: number; // 0-59
  /** Whether this is prime time (affects viewership) */
  isPrimeTime: boolean;
}

// ============================================================================
// SERIALIZED STORYLINES (for soap operas)
// ============================================================================

export type StorylineTheme =
  | 'romance'
  | 'betrayal'
  | 'secret'
  | 'amnesia'
  | 'evil_twin'
  | 'corporate_intrigue'
  | 'family_drama'
  | 'murder_mystery'
  | 'forbidden_love'
  | 'revenge';

export interface Storyline {
  id: string;
  title: string;
  characters: string[]; // character names
  plot: string;
  status: 'ongoing' | 'resolved' | 'cliffhanger';
  startEpisode: number;
  expectedDuration: number; // episodes
  themes: StorylineTheme[];
  emotionalIntensity: number; // 0-10
}

export interface PlotTwist {
  type: 'secret_revealed' | 'character_returns' | 'betrayal' | 'pregnancy' | 'death' | 'evil_twin' | 'wedding_interrupted';
  affectedCharacters: string[];
  impact: 'minor' | 'major' | 'shocking';
  scheduledEpisode: number;
  executed: boolean;
}

// ============================================================================
// TV SHOW COMPONENT
// ============================================================================

export interface TVShowComponent extends Component {
  type: 'tv_show';

  /** Show identity */
  showId: string;
  title: string;
  format: ShowFormat;
  stationId: string;

  /** Creative team (agent IDs) */
  creator: string;
  showrunner?: string;
  writers: string[];
  directors: string[];

  /** Cast */
  cast: CastMember[];
  characters: ShowCharacter[];

  /** Production details */
  currentSeason: number;
  totalEpisodes: number;
  episodesThisSeason: number;
  episodeDuration: number; // minutes

  /** Status and schedule */
  status: ShowStatus;
  airSchedule?: AirSchedule;
  pilotAiredTick?: number;
  lastEpisodeAiredTick?: number;

  /** Content description */
  premise: string; // LLM-generated show concept
  genres: string[];
  themes: string[];
  targetAudience: TargetAudience;

  /** Running gags and cultural elements */
  runningGags: string[];
  catchphrases: Map<string, string>; // character -> phrase

  /** Serialized storylines (for soap operas, dramas) */
  storylines: Storyline[];
  upcomingTwists: PlotTwist[];

  /** Reception */
  averageRating: number; // 0-10 from viewers
  peakViewership: number;
  totalViewership: number;
  awards: Award[];
  culturalImpact: number; // 0-100 how much it influences village

  /** Show bible (for consistency) */
  showBible: {
    tone: string;
    visualStyle: string;
    prohibitedTopics: string[];
    signatureElements: string[];
  };

  /** Lifecycle */
  createdTick: number;
  renewedSeasons: number;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let showIdCounter = 0;

export function createTVShowComponent(
  title: string,
  format: ShowFormat,
  stationId: string,
  creatorId: string,
  tick: number
): TVShowComponent {
  const showId = `show_${Date.now()}_${++showIdCounter}`;

  return {
    type: 'tv_show',
    version: 1,

    showId,
    title,
    format,
    stationId,

    creator: creatorId,
    writers: [creatorId],
    directors: [],

    cast: [],
    characters: [],

    currentSeason: 1,
    totalEpisodes: 0,
    episodesThisSeason: 0,
    episodeDuration: getDefaultDuration(format),

    status: 'in_development',

    premise: '',
    genres: [],
    themes: [],
    targetAudience: 'family',

    runningGags: [],
    catchphrases: new Map(),

    storylines: [],
    upcomingTwists: [],

    averageRating: 0,
    peakViewership: 0,
    totalViewership: 0,
    awards: [],
    culturalImpact: 0,

    showBible: {
      tone: '',
      visualStyle: '',
      prohibitedTopics: [],
      signatureElements: [],
    },

    createdTick: tick,
    renewedSeasons: 0,
  };
}

export function createShowCharacter(
  name: string,
  personality: string,
  occupation: string
): ShowCharacter {
  return {
    name,
    personality,
    occupation,
    relationships: new Map(),
    characterArc: '',
    backstory: '',
    catchphrases: [],
  };
}

export function createStoryline(
  title: string,
  characters: string[],
  plot: string,
  themes: StorylineTheme[],
  startEpisode: number,
  expectedDuration: number
): Storyline {
  return {
    id: `storyline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    characters,
    plot,
    status: 'ongoing',
    startEpisode,
    expectedDuration,
    themes,
    emotionalIntensity: 5,
  };
}

export function createPlotTwist(
  type: PlotTwist['type'],
  affectedCharacters: string[],
  impact: PlotTwist['impact'],
  scheduledEpisode: number
): PlotTwist {
  return {
    type,
    affectedCharacters,
    impact,
    scheduledEpisode,
    executed: false,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getDefaultDuration(format: ShowFormat): number {
  switch (format) {
    case 'sitcom':
    case 'childrens':
      return 22;
    case 'drama':
    case 'reality_tv':
      return 44;
    case 'soap_opera':
      return 30;
    case 'news':
    case 'weather':
      return 30;
    case 'talk_show':
    case 'late_night':
      return 60;
    case 'game_show':
      return 30;
    case 'documentary':
      return 60;
    case 'cooking_show':
      return 30;
    case 'sports':
      return 120;
    default:
      return 30;
  }
}

export function addCastMember(
  show: TVShowComponent,
  agentId: string,
  characterName: string,
  role: CastRole,
  payPerEpisode: number
): CastMember {
  const member: CastMember = {
    agentId,
    characterName,
    role,
    episodesAppeared: 0,
    payPerEpisode,
  };

  show.cast.push(member);
  return member;
}

export function removeCastMember(
  show: TVShowComponent,
  agentId: string
): boolean {
  const index = show.cast.findIndex(c => c.agentId === agentId);
  if (index === -1) return false;
  show.cast.splice(index, 1);
  return true;
}

export function getCastByRole(
  show: TVShowComponent,
  role: CastRole
): CastMember[] {
  return show.cast.filter(c => c.role === role);
}

export function renewShow(show: TVShowComponent): void {
  show.currentSeason++;
  show.episodesThisSeason = 0;
  show.renewedSeasons++;
  show.status = 'in_production';
}

export function cancelShow(show: TVShowComponent): void {
  show.status = 'cancelled';
}

export function putOnHiatus(show: TVShowComponent): void {
  show.status = 'hiatus';
}

export function isScriptedFormat(format: ShowFormat): boolean {
  return ['sitcom', 'drama', 'soap_opera', 'childrens'].includes(format);
}

export function isLiveFormat(format: ShowFormat): boolean {
  return ['news', 'talk_show', 'sports', 'weather'].includes(format);
}

export function isPrimeTimeSlot(hour: number): boolean {
  // Prime time is typically 8pm-11pm (20-23)
  return hour >= 20 && hour <= 22;
}

export function estimateViewership(
  show: TVShowComponent,
  isPrimeTime: boolean,
  stationReputation: number
): number {
  let baseViewership = 100;

  // Format multiplier
  if (show.format === 'news') baseViewership *= 1.5;
  if (show.format === 'drama' || show.format === 'sitcom') baseViewership *= 1.3;
  if (show.format === 'soap_opera') baseViewership *= 1.2;

  // Prime time bonus
  if (isPrimeTime) baseViewership *= 2;

  // Show popularity
  baseViewership *= (1 + show.averageRating / 10);

  // Station reputation
  baseViewership *= (stationReputation / 100);

  // Cultural impact
  baseViewership *= (1 + show.culturalImpact / 100);

  return Math.round(baseViewership);
}

export function updateCulturalImpact(show: TVShowComponent): void {
  // Cultural impact grows based on ratings, viewership, and memorable moments
  const ratingImpact = show.averageRating * 2;
  const viewershipImpact = Math.log10(show.totalViewership + 1) * 5;
  const catchphraseImpact = show.catchphrases.size * 3;

  const totalImpact = ratingImpact + viewershipImpact + catchphraseImpact;

  // Slowly approach total impact (prevents sudden jumps)
  show.culturalImpact += (totalImpact - show.culturalImpact) * 0.1;
  show.culturalImpact = Math.min(100, Math.max(0, show.culturalImpact));
}
