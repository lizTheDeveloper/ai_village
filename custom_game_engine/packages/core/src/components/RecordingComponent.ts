/**
 * RecordingComponent - Tracks captured media (video, audio, photos)
 *
 * Used by reporters, photographers, and documentarians to record events,
 * interviews, and B-roll footage for news stories and documentaries.
 *
 * Key features:
 * - Quality based on reporter skill + equipment
 * - Subject tracking (who/what was recorded)
 * - Location metadata
 * - Association with news stories
 */

import type { Component } from '../ecs/Component.js';

/**
 * Type of media captured.
 */
export type MediaType =
  | 'video'           // Video footage
  | 'audio'           // Audio recording (interviews, ambient sound)
  | 'photo'           // Still photograph
  | 'live_broadcast'; // Live streaming

/**
 * Category of recording content.
 */
export type RecordingCategory =
  | 'interview'       // Interview with person
  | 'event_coverage'  // Covering an event (battle, ceremony, disaster)
  | 'b_roll'          // Background footage
  | 'standup'         // Reporter on-camera commentary
  | 'ambient'         // Environmental footage (city, nature)
  | 'documentary';    // Long-form documentary footage

/**
 * Recording status.
 */
export type RecordingStatus =
  | 'recording'       // Currently recording
  | 'completed'       // Recording finished
  | 'editing'         // In post-production
  | 'published';      // Used in article/broadcast

/**
 * RecordingComponent - Media capture tracking.
 */
export interface RecordingComponent extends Component {
  type: 'recording';

  /** Type of media */
  mediaType: MediaType;

  /** Content category */
  category: RecordingCategory;

  /** Status */
  status: RecordingStatus;

  /** Quality (0.0-1.0) based on skill + equipment */
  quality: number;

  /** Location where recorded */
  location: { x: number; y: number };

  /** Who recorded this (reporter/photographer ID) */
  recordedBy: string;

  /** Reporter name */
  reporterName: string;

  /** When recording started */
  startedTick: number;

  /** When recording finished */
  completedTick?: number;

  /** Duration in ticks */
  durationTicks: number;

  /** Subject IDs (agents, entities recorded) */
  subjectIds: string[];

  /** Subject names (for display) */
  subjectNames: string[];

  /** Event ID if covering a specific event */
  associatedEventId?: string;

  /** Story ID if part of a news story */
  associatedStoryId?: string;

  /** Description of what was recorded */
  description: string;

  /** Transcript (for audio/video interviews) */
  transcript?: string;

  /** Equipment quality modifier */
  equipmentQuality: number; // 0.5-2.0 multiplier

  /** File size estimate (for realism) */
  fileSizeKB: number;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a recording component.
 */
export function createRecordingComponent(
  mediaType: MediaType,
  category: RecordingCategory,
  recordedBy: string,
  reporterName: string,
  location: { x: number; y: number },
  currentTick: number,
  options?: {
    subjectIds?: string[];
    subjectNames?: string[];
    associatedEventId?: string;
    associatedStoryId?: string;
    description?: string;
    equipmentQuality?: number;
  }
): RecordingComponent {
  const quality = calculateRecordingQuality(options?.equipmentQuality ?? 1.0);
  const durationTicks = estimateDurationTicks(category);

  return {
    type: 'recording',
    version: 1,
    mediaType,
    category,
    status: 'recording',
    quality,
    location,
    recordedBy,
    reporterName,
    startedTick: currentTick,
    durationTicks,
    subjectIds: options?.subjectIds ?? [],
    subjectNames: options?.subjectNames ?? [],
    associatedEventId: options?.associatedEventId,
    associatedStoryId: options?.associatedStoryId,
    description: options?.description ?? `${category} recording`,
    equipmentQuality: options?.equipmentQuality ?? 1.0,
    fileSizeKB: estimateFileSize(mediaType, durationTicks),
  };
}

/**
 * Calculate recording quality based on equipment and random variation.
 */
function calculateRecordingQuality(equipmentQuality: number): number {
  const baseQuality = 0.5 + Math.random() * 0.3; // 0.5-0.8
  const equipmentBonus = (equipmentQuality - 1.0) * 0.2; // ±20% from equipment
  const randomVariation = (Math.random() - 0.5) * 0.1; // ±5%

  return Math.max(0.1, Math.min(1.0, baseQuality + equipmentBonus + randomVariation));
}

/**
 * Estimate recording duration based on category.
 */
function estimateDurationTicks(category: RecordingCategory): number {
  const TICKS_PER_SECOND = 20;
  const TICKS_PER_MINUTE = 60 * TICKS_PER_SECOND;

  switch (category) {
    case 'interview':
      return 5 * TICKS_PER_MINUTE; // 5 minutes
    case 'event_coverage':
      return 10 * TICKS_PER_MINUTE; // 10 minutes
    case 'b_roll':
      return 2 * TICKS_PER_MINUTE; // 2 minutes
    case 'standup':
      return 1 * TICKS_PER_MINUTE; // 1 minute
    case 'ambient':
      return 3 * TICKS_PER_MINUTE; // 3 minutes
    case 'documentary':
      return 30 * TICKS_PER_MINUTE; // 30 minutes
    default:
      return 5 * TICKS_PER_MINUTE;
  }
}

/**
 * Estimate file size based on media type and duration.
 */
function estimateFileSize(mediaType: MediaType, durationTicks: number): number {
  const durationMinutes = durationTicks / (60 * 20);

  switch (mediaType) {
    case 'video':
      return Math.floor(durationMinutes * 50000); // ~50MB per minute
    case 'audio':
      return Math.floor(durationMinutes * 5000); // ~5MB per minute
    case 'photo':
      return 3000; // ~3MB per photo
    case 'live_broadcast':
      return Math.floor(durationMinutes * 80000); // ~80MB per minute (higher quality)
    default:
      return 10000;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Complete a recording.
 */
export function completeRecording(
  recording: RecordingComponent,
  currentTick: number
): void {
  recording.status = 'completed';
  recording.completedTick = currentTick;
}

/**
 * Mark recording as being edited.
 */
export function startEditingRecording(recording: RecordingComponent): void {
  if (recording.status !== 'completed') {
    throw new Error('Cannot edit recording that is not completed');
  }
  recording.status = 'editing';
}

/**
 * Publish recording (used in article/broadcast).
 */
export function publishRecording(recording: RecordingComponent): void {
  if (recording.status !== 'editing' && recording.status !== 'completed') {
    throw new Error('Cannot publish recording that is not completed or edited');
  }
  recording.status = 'published';
}

/**
 * Add subjects to recording.
 */
export function addRecordingSubject(
  recording: RecordingComponent,
  subjectId: string,
  subjectName: string
): void {
  if (!recording.subjectIds.includes(subjectId)) {
    recording.subjectIds.push(subjectId);
    recording.subjectNames.push(subjectName);
  }
}

/**
 * Set recording transcript (for interviews).
 */
export function setRecordingTranscript(
  recording: RecordingComponent,
  transcript: string
): void {
  recording.transcript = transcript;
}

/**
 * Calculate total storage used by recordings.
 */
export function calculateTotalStorageKB(recordings: RecordingComponent[]): number {
  return recordings.reduce((total, r) => total + r.fileSizeKB, 0);
}

/**
 * Get recordings by status.
 */
export function getRecordingsByStatus(
  recordings: RecordingComponent[],
  status: RecordingStatus
): RecordingComponent[] {
  return recordings.filter(r => r.status === status);
}

/**
 * Get recordings for a story.
 */
export function getRecordingsForStory(
  recordings: RecordingComponent[],
  storyId: string
): RecordingComponent[] {
  return recordings.filter(r => r.associatedStoryId === storyId);
}

/**
 * Get recordings by reporter.
 */
export function getRecordingsByReporter(
  recordings: RecordingComponent[],
  reporterId: string
): RecordingComponent[] {
  return recordings.filter(r => r.recordedBy === reporterId);
}

/**
 * Check if recording is in progress.
 */
export function isRecordingInProgress(
  recording: RecordingComponent,
  currentTick: number
): boolean {
  return (
    recording.status === 'recording' &&
    currentTick < recording.startedTick + recording.durationTicks
  );
}

/**
 * Get recording progress (0.0-1.0).
 */
export function getRecordingProgress(
  recording: RecordingComponent,
  currentTick: number
): number {
  if (recording.status !== 'recording') {
    return 1.0;
  }

  const elapsed = currentTick - recording.startedTick;
  const progress = elapsed / recording.durationTicks;

  return Math.min(1.0, Math.max(0.0, progress));
}
