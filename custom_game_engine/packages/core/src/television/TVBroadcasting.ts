/**
 * TVBroadcasting - Broadcast schedule and transmission
 *
 * Manages programming schedules, real-time broadcasting,
 * and viewer tracking. Integrates with the content system
 * to stream episodes to viewers.
 */

import type { Component } from '../ecs/Component.js';
import type { DayOfWeek } from './TVShow.js';

// ============================================================================
// SCHEDULE TYPES
// ============================================================================

export type ProgramType = 'show' | 'news' | 'commercial' | 'promo' | 'off_air';

export interface ProgramSlot {
  id: string;
  channelNumber: number;
  /** Day of week */
  day: DayOfWeek;
  /** Start hour (0-23) */
  startHour: number;
  /** Start minute (0-59) */
  startMinute: number;
  /** Duration in minutes */
  duration: number;
  /** What airs in this slot */
  programType: ProgramType;
  /** Show ID (if programType is 'show') */
  showId?: string;
  /** Specific content ID to air (for reruns) */
  contentId?: string;
  /** Whether this is a rerun */
  isRerun: boolean;
  /** Whether slot repeats weekly */
  isRecurring: boolean;
}

export interface BroadcastEvent {
  id: string;
  stationId: string;
  channelNumber: number;
  contentId: string;
  showId: string;
  startTick: number;
  endTick: number;
  /** Live viewers at any point */
  peakViewers: number;
  /** Unique viewers who tuned in */
  totalViewers: number;
  /** Average rating from viewers who rated */
  averageRating: number;
  /** Whether this was a live broadcast (news, sports) */
  isLive: boolean;
}

// ============================================================================
// VIEWER TYPES
// ============================================================================

export interface ViewerReaction {
  viewerId: string;
  contentId: string;
  showId: string;
  /** Rating 1-10 */
  rating: number;
  /** Whether they enjoyed it */
  enjoyed: boolean;
  /** LLM-generated thoughts about the episode */
  thoughts: string;
  /** Will they watch next episode? */
  willWatchNext: boolean;
  /** Tick when they watched */
  watchedTick: number;
}

export interface ViewerPreferences {
  /** Favorite show IDs */
  favoriteShows: string[];
  /** Preferred genres */
  preferredGenres: string[];
  /** Shows they've stopped watching */
  droppedShows: string[];
  /** Most watched time slot */
  preferredWatchTime: number; // hour
}

// ============================================================================
// ADVERTISEMENT TYPES
// ============================================================================

export interface Advertisement {
  id: string;
  sponsor: string;
  product: string;
  duration: number; // seconds
  costPerAiring: number;
  revenuePerAiring: number;
  /** Minimum viewership for this ad */
  minimumViewers: number;
}

export interface CommercialBreak {
  slotId: string;
  position: 'start' | 'middle' | 'end';
  ads: Advertisement[];
  totalDuration: number;
}

// ============================================================================
// BROADCAST COMPONENT
// ============================================================================

export interface TVBroadcastComponent extends Component {
  type: 'tv_broadcast';

  /** Station this broadcast belongs to */
  stationId: string;

  /** Programming schedule (weekly) */
  schedule: ProgramSlot[];

  /** Current broadcasts (one per channel) */
  activeBroadcasts: Map<number, BroadcastEvent>;

  /** Broadcast history */
  recentBroadcasts: BroadcastEvent[];
  maxHistorySize: number;

  /** Viewer tracking */
  currentViewers: Map<number, Set<string>>; // channel -> viewer IDs
  viewerReactions: ViewerReaction[];

  /** Advertising */
  advertisements: Advertisement[];
  commercialBreaks: CommercialBreak[];

  /** Metrics */
  totalBroadcastMinutes: number;
  totalAdRevenue: number;
  averageViewership: number;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let slotIdCounter = 0;
let broadcastIdCounter = 0;

export function createTVBroadcastComponent(stationId: string): TVBroadcastComponent {
  return {
    type: 'tv_broadcast',
    version: 1,

    stationId,

    schedule: [],

    activeBroadcasts: new Map(),

    recentBroadcasts: [],
    maxHistorySize: 100,

    currentViewers: new Map(),
    viewerReactions: [],

    advertisements: [],
    commercialBreaks: [],

    totalBroadcastMinutes: 0,
    totalAdRevenue: 0,
    averageViewership: 0,
  };
}

export function createProgramSlot(
  channelNumber: number,
  day: DayOfWeek,
  startHour: number,
  startMinute: number,
  duration: number,
  programType: ProgramType,
  options?: {
    showId?: string;
    contentId?: string;
    isRerun?: boolean;
    isRecurring?: boolean;
  }
): ProgramSlot {
  return {
    id: `slot_${++slotIdCounter}`,
    channelNumber,
    day,
    startHour,
    startMinute,
    duration,
    programType,
    showId: options?.showId,
    contentId: options?.contentId,
    isRerun: options?.isRerun ?? false,
    isRecurring: options?.isRecurring ?? true,
  };
}

export function createBroadcastEvent(
  stationId: string,
  channelNumber: number,
  contentId: string,
  showId: string,
  startTick: number,
  durationMinutes: number,
  isLive: boolean = false
): BroadcastEvent {
  const ticksPerMinute = 20 * 60; // 20 ticks/sec * 60 sec
  return {
    id: `broadcast_${++broadcastIdCounter}`,
    stationId,
    channelNumber,
    contentId,
    showId,
    startTick,
    endTick: startTick + (durationMinutes * ticksPerMinute),
    peakViewers: 0,
    totalViewers: 0,
    averageRating: 0,
    isLive,
  };
}

export function createViewerReaction(
  viewerId: string,
  contentId: string,
  showId: string,
  rating: number,
  thoughts: string,
  watchedTick: number
): ViewerReaction {
  return {
    viewerId,
    contentId,
    showId,
    rating,
    enjoyed: rating >= 6,
    thoughts,
    willWatchNext: rating >= 7,
    watchedTick,
  };
}

export function createAdvertisement(
  sponsor: string,
  product: string,
  duration: number,
  costPerAiring: number
): Advertisement {
  return {
    id: `ad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sponsor,
    product,
    duration,
    costPerAiring,
    revenuePerAiring: costPerAiring * 0.7, // 70% revenue
    minimumViewers: 10,
  };
}

// ============================================================================
// SCHEDULE FUNCTIONS
// ============================================================================

export function addProgramSlot(
  broadcast: TVBroadcastComponent,
  slot: ProgramSlot
): void {
  // Check for conflicts
  const conflicts = findScheduleConflicts(broadcast, slot);
  if (conflicts.length > 0) {
    throw new Error(`Schedule conflict with slots: ${conflicts.map(c => c.id).join(', ')}`);
  }

  broadcast.schedule.push(slot);
}

export function removeProgramSlot(
  broadcast: TVBroadcastComponent,
  slotId: string
): boolean {
  const index = broadcast.schedule.findIndex(s => s.id === slotId);
  if (index === -1) return false;
  broadcast.schedule.splice(index, 1);
  return true;
}

export function findScheduleConflicts(
  broadcast: TVBroadcastComponent,
  newSlot: ProgramSlot
): ProgramSlot[] {
  const conflicts: ProgramSlot[] = [];

  const newStart = newSlot.startHour * 60 + newSlot.startMinute;
  const newEnd = newStart + newSlot.duration;

  for (const slot of broadcast.schedule) {
    // Same channel and same day
    if (slot.channelNumber !== newSlot.channelNumber) continue;
    if (slot.day !== newSlot.day) continue;

    const slotStart = slot.startHour * 60 + slot.startMinute;
    const slotEnd = slotStart + slot.duration;

    // Check overlap
    if (newStart < slotEnd && newEnd > slotStart) {
      conflicts.push(slot);
    }
  }

  return conflicts;
}

export function getCurrentSlot(
  broadcast: TVBroadcastComponent,
  channelNumber: number,
  day: DayOfWeek,
  hour: number,
  minute: number
): ProgramSlot | null {
  const currentMinutes = hour * 60 + minute;

  for (const slot of broadcast.schedule) {
    if (slot.channelNumber !== channelNumber) continue;
    if (slot.day !== day) continue;

    const slotStart = slot.startHour * 60 + slot.startMinute;
    const slotEnd = slotStart + slot.duration;

    if (currentMinutes >= slotStart && currentMinutes < slotEnd) {
      return slot;
    }
  }

  return null;
}

export function getUpcomingSlots(
  broadcast: TVBroadcastComponent,
  channelNumber: number,
  day: DayOfWeek,
  hour: number,
  count: number = 5
): ProgramSlot[] {
  const currentMinutes = hour * 60;

  return broadcast.schedule
    .filter(slot =>
      slot.channelNumber === channelNumber &&
      slot.day === day &&
      (slot.startHour * 60 + slot.startMinute) >= currentMinutes
    )
    .sort((a, b) => (a.startHour * 60 + a.startMinute) - (b.startHour * 60 + b.startMinute))
    .slice(0, count);
}

// ============================================================================
// BROADCAST FUNCTIONS
// ============================================================================

export function startBroadcast(
  broadcast: TVBroadcastComponent,
  event: BroadcastEvent
): void {
  broadcast.activeBroadcasts.set(event.channelNumber, event);
  broadcast.currentViewers.set(event.channelNumber, new Set());
}

export function endBroadcast(
  broadcast: TVBroadcastComponent,
  channelNumber: number,
  tick: number
): BroadcastEvent | null {
  const event = broadcast.activeBroadcasts.get(channelNumber);
  if (!event) return null;

  // Calculate final metrics
  const viewers = broadcast.currentViewers.get(channelNumber);
  if (viewers) {
    event.totalViewers = viewers.size;
  }

  // Archive the broadcast
  broadcast.recentBroadcasts.push(event);
  if (broadcast.recentBroadcasts.length > broadcast.maxHistorySize) {
    broadcast.recentBroadcasts.shift();
  }

  // Update station metrics
  const durationMinutes = (tick - event.startTick) / (20 * 60);
  broadcast.totalBroadcastMinutes += durationMinutes;

  // Clear active broadcast
  broadcast.activeBroadcasts.delete(channelNumber);
  broadcast.currentViewers.delete(channelNumber);

  return event;
}

export function tuneIn(
  broadcast: TVBroadcastComponent,
  channelNumber: number,
  viewerId: string
): boolean {
  const viewers = broadcast.currentViewers.get(channelNumber);
  if (!viewers) return false;

  viewers.add(viewerId);

  // Update peak viewers
  const event = broadcast.activeBroadcasts.get(channelNumber);
  if (event && viewers.size > event.peakViewers) {
    event.peakViewers = viewers.size;
  }

  return true;
}

export function tuneOut(
  broadcast: TVBroadcastComponent,
  channelNumber: number,
  viewerId: string
): boolean {
  const viewers = broadcast.currentViewers.get(channelNumber);
  if (!viewers) return false;

  return viewers.delete(viewerId);
}

export function recordReaction(
  broadcast: TVBroadcastComponent,
  reaction: ViewerReaction
): void {
  broadcast.viewerReactions.push(reaction);

  // Update average rating for the broadcast
  const entries = Array.from(broadcast.activeBroadcasts.entries());
  const matchEntry = entries.find(([_, e]) => e.contentId === reaction.contentId);
  const event = matchEntry ? broadcast.activeBroadcasts.get(matchEntry[0]) : undefined;

  if (event) {
    const relevantReactions = broadcast.viewerReactions.filter(
      r => r.contentId === event.contentId
    );
    const totalRating = relevantReactions.reduce((sum, r) => sum + r.rating, 0);
    event.averageRating = totalRating / relevantReactions.length;
  }
}

// ============================================================================
// ADVERTISING FUNCTIONS
// ============================================================================

export function scheduleCommercialBreak(
  broadcast: TVBroadcastComponent,
  slotId: string,
  position: CommercialBreak['position'],
  ads: Advertisement[]
): CommercialBreak {
  const totalDuration = ads.reduce((sum, ad) => sum + ad.duration, 0);

  const commercialBreak: CommercialBreak = {
    slotId,
    position,
    ads,
    totalDuration,
  };

  broadcast.commercialBreaks.push(commercialBreak);
  return commercialBreak;
}

export function runCommercials(
  broadcast: TVBroadcastComponent,
  slotId: string,
  position: CommercialBreak['position'],
  currentViewers: number
): number {
  const commercialBreak = broadcast.commercialBreaks.find(
    c => c.slotId === slotId && c.position === position
  );

  if (!commercialBreak) return 0;

  let revenue = 0;

  for (const ad of commercialBreak.ads) {
    if (currentViewers >= ad.minimumViewers) {
      revenue += ad.revenuePerAiring;
    }
  }

  broadcast.totalAdRevenue += revenue;
  return revenue;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getChannelViewerCount(
  broadcast: TVBroadcastComponent,
  channelNumber: number
): number {
  return broadcast.currentViewers.get(channelNumber)?.size ?? 0;
}

export function getTotalViewers(broadcast: TVBroadcastComponent): number {
  let total = 0;
  broadcast.currentViewers.forEach((viewers) => {
    total += viewers.size;
  });
  return total;
}

export function getAverageViewershipForShow(
  broadcast: TVBroadcastComponent,
  showId: string
): number {
  const showBroadcasts = broadcast.recentBroadcasts.filter(b => b.showId === showId);
  if (showBroadcasts.length === 0) return 0;

  const totalViewers = showBroadcasts.reduce((sum, b) => sum + b.totalViewers, 0);
  return totalViewers / showBroadcasts.length;
}

export function getShowRatings(
  broadcast: TVBroadcastComponent,
  showId: string
): number {
  const reactions = broadcast.viewerReactions.filter(r => r.showId === showId);
  if (reactions.length === 0) return 0;

  const totalRating = reactions.reduce((sum, r) => sum + r.rating, 0);
  return totalRating / reactions.length;
}
