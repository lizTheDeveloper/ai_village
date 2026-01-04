/**
 * VideoReplayComponent - Stores game state "video" as entity snapshots, not pixels
 *
 * Instead of storing actual video files, this component stores a sequence of
 * game state snapshots that can be replayed later on TV broadcasts.
 *
 * Think of it like a game replay system:
 * - Each "frame" captures entity positions, states, animations
 * - Camera position and angle stored per frame
 * - When played on TV, reconstruct the scene from stored data
 * - Extremely compressible (just entity IDs + positions + states)
 *
 * Compression Example:
 * - Actual video: 50MB per minute (1920x1080 @ 30fps)
 * - This system: ~50KB per minute (entity snapshots @ 2fps)
 * - 1000x compression ratio!
 */

import type { Component } from '../ecs/Component.js';

/**
 * A single frame in the replay sequence.
 * Captures game state at one moment in time.
 */
export interface ReplayFrame {
  /** Tick when this frame was captured */
  tick: number;

  /** Camera position (reporter's position) */
  cameraX: number;
  cameraY: number;

  /** Camera facing angle (radians) */
  cameraAngle: number;

  /** Camera zoom level (for different shot types) */
  cameraZoom: number;

  /** Entities visible in this frame */
  entities: ReplayEntity[];
}

/**
 * Snapshot of an entity in a replay frame.
 * Only stores data needed for visual reconstruction.
 */
export interface ReplayEntity {
  /** Entity ID (for later lookup if still exists) */
  entityId: string;

  /** Entity type/category */
  entityType: string; // 'agent', 'alien', 'building', 'particle', etc.

  /** Display name (for UI) */
  name?: string;

  /** Position in world */
  x: number;
  y: number;

  /** Facing direction (for sprite orientation) */
  facingAngle?: number;

  /** Animation state */
  animation?: {
    state: string; // 'idle', 'walking', 'attacking', 'dying', etc.
    frame: number; // Current animation frame
  };

  /** Visual state */
  visual?: {
    sprite?: string; // Sprite ID
    color?: string; // Tint color
    scale?: number; // Size multiplier
    opacity?: number; // 0.0-1.0
  };

  /** Health/status (for visual effects) */
  health?: number; // 0.0-1.0

  /** Distance from camera */
  distanceFromCamera: number;
}

/**
 * VideoReplayComponent - Stores a sequence of replay frames
 */
export interface VideoReplayComponent extends Component {
  type: 'video_replay';

  /** Recording metadata */
  recordingId: string; // Links to RecordingComponent
  recordedBy: string; // Reporter agent ID
  recordedByName: string;

  /** Recording timestamps */
  startTick: number;
  endTick?: number;

  /** Frame sequence */
  frames: ReplayFrame[];

  /** Frame capture rate (ticks per frame) */
  frameInterval: number; // Default: 10 ticks = 2 FPS

  /** Maximum frames to store */
  maxFrames: number; // Default: 360 (3 minutes @ 2 FPS)

  /** Current recording status */
  status: 'recording' | 'completed' | 'corrupted';

  /** Associated story/event */
  associatedStoryId?: string;
  associatedEventId?: string;

  /** Replay metadata */
  metadata: {
    /** Total duration in ticks */
    durationTicks: number;

    /** Number of unique entities captured */
    entityCount: number;

    /** Primary subject (most screen time) */
    primarySubject?: string;

    /** Shot types used (close-up, wide, etc.) */
    shotTypes: string[];

    /** Quality score (based on framing, subject visibility) */
    quality: number; // 0.0-1.0

    /** Estimated storage size (bytes) */
    storageSizeBytes: number;
  };
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new video replay component (starts recording)
 */
export function createVideoReplayComponent(
  recordingId: string,
  recordedBy: string,
  recordedByName: string,
  startTick: number,
  options?: {
    frameInterval?: number;
    maxFrames?: number;
    associatedStoryId?: string;
    associatedEventId?: string;
  }
): VideoReplayComponent {
  return {
    type: 'video_replay',
    version: 1,
    recordingId,
    recordedBy,
    recordedByName,
    startTick,
    frames: [],
    frameInterval: options?.frameInterval ?? 10, // 2 FPS (10 ticks at 20 TPS)
    maxFrames: options?.maxFrames ?? 360, // 3 minutes @ 2 FPS
    status: 'recording',
    associatedStoryId: options?.associatedStoryId,
    associatedEventId: options?.associatedEventId,
    metadata: {
      durationTicks: 0,
      entityCount: 0,
      shotTypes: [],
      quality: 0,
      storageSizeBytes: 0,
    },
  };
}

// ============================================================================
// FRAME CAPTURE
// ============================================================================

/**
 * Capture a frame from the current game state.
 * Call this periodically while recording.
 */
export function captureFrame(
  replay: VideoReplayComponent,
  currentTick: number,
  cameraX: number,
  cameraY: number,
  cameraAngle: number,
  cameraZoom: number,
  visibleEntities: Array<{
    entityId: string;
    entityType: string;
    name?: string;
    x: number;
    y: number;
    facingAngle?: number;
    animation?: { state: string; frame: number };
    visual?: { sprite?: string; color?: string; scale?: number; opacity?: number };
    health?: number;
  }>
): void {
  // Check if we should capture this frame (based on frame interval)
  if (replay.frames.length > 0) {
    const lastFrame = replay.frames[replay.frames.length - 1]!;
    if (currentTick - lastFrame.tick < replay.frameInterval) {
      return; // Too soon for next frame
    }
  }

  // Calculate distances from camera
  const replayEntities: ReplayEntity[] = visibleEntities.map((entity) => {
    const dx = entity.x - cameraX;
    const dy = entity.y - cameraY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return {
      ...entity,
      distanceFromCamera: distance,
    };
  });

  // Sort by distance (for rendering order)
  replayEntities.sort((a, b) => b.distanceFromCamera - a.distanceFromCamera);

  // Create frame
  const frame: ReplayFrame = {
    tick: currentTick,
    cameraX,
    cameraY,
    cameraAngle,
    cameraZoom,
    entities: replayEntities,
  };

  // Add frame to sequence
  replay.frames.push(frame);

  // Enforce max frames (rolling window)
  if (replay.frames.length > replay.maxFrames) {
    replay.frames.shift(); // Remove oldest frame
  }

  // Update metadata
  updateReplayMetadata(replay);
}

/**
 * Update replay metadata after adding frames
 */
function updateReplayMetadata(replay: VideoReplayComponent): void {
  if (replay.frames.length === 0) return;

  const firstFrame = replay.frames[0]!;
  const lastFrame = replay.frames[replay.frames.length - 1]!;

  replay.metadata.durationTicks = lastFrame.tick - firstFrame.tick;

  // Count unique entities
  const uniqueEntities = new Set<string>();
  for (const frame of replay.frames) {
    for (const entity of frame.entities) {
      uniqueEntities.add(entity.entityId);
    }
  }
  replay.metadata.entityCount = uniqueEntities.size;

  // Estimate storage size
  replay.metadata.storageSizeBytes = estimateStorageSize(replay);

  // Calculate quality (based on frame count and entity visibility)
  replay.metadata.quality = calculateReplayQuality(replay);
}

/**
 * Estimate storage size of replay (compressed JSON)
 */
function estimateStorageSize(replay: VideoReplayComponent): number {
  // Each frame: ~500 bytes (compressed)
  // Each entity per frame: ~100 bytes
  const avgEntitiesPerFrame = replay.frames.reduce(
    (sum, frame) => sum + frame.entities.length,
    0
  ) / Math.max(1, replay.frames.length);

  const frameSizeBytes = 500 + avgEntitiesPerFrame * 100;
  return Math.floor(replay.frames.length * frameSizeBytes);
}

/**
 * Calculate quality score for replay
 */
function calculateReplayQuality(replay: VideoReplayComponent): number {
  if (replay.frames.length === 0) return 0;

  let qualityScore = 0.5; // Base quality

  // Bonus: Good frame count (not too short, not too long)
  const idealFrames = 120; // 1 minute @ 2 FPS
  const frameDiff = Math.abs(replay.frames.length - idealFrames);
  qualityScore += Math.max(0, 0.2 - frameDiff / 1000);

  // Bonus: Subject always in frame
  let framesWithSubject = 0;
  for (const frame of replay.frames) {
    if (frame.entities.length > 0) {
      framesWithSubject++;
    }
  }
  const subjectCoverage = framesWithSubject / replay.frames.length;
  qualityScore += subjectCoverage * 0.2;

  // Bonus: Multiple angles/variety
  const uniqueAngles = new Set(replay.frames.map(f => Math.floor(f.cameraAngle * 10)));
  qualityScore += Math.min(0.1, uniqueAngles.size / 50);

  return Math.min(1.0, Math.max(0.0, qualityScore));
}

// ============================================================================
// RECORDING CONTROL
// ============================================================================

/**
 * Complete a recording
 */
export function completeReplay(replay: VideoReplayComponent, endTick: number): void {
  replay.status = 'completed';
  replay.endTick = endTick;
  updateReplayMetadata(replay);
}

/**
 * Get frame at specific tick (for playback)
 */
export function getFrameAtTick(
  replay: VideoReplayComponent,
  tick: number
): ReplayFrame | null {
  if (replay.frames.length === 0) return null;

  // Find closest frame
  let closestFrame = replay.frames[0]!;
  let closestDiff = Math.abs(tick - closestFrame.tick);

  for (const frame of replay.frames) {
    const diff = Math.abs(tick - frame.tick);
    if (diff < closestDiff) {
      closestFrame = frame;
      closestDiff = diff;
    }
  }

  return closestFrame;
}

/**
 * Get frame by index (for sequential playback)
 */
export function getFrameByIndex(
  replay: VideoReplayComponent,
  index: number
): ReplayFrame | null {
  if (index < 0 || index >= replay.frames.length) return null;
  return replay.frames[index] ?? null;
}

/**
 * Get all entities that appear in the replay
 */
export function getAllReplayEntities(replay: VideoReplayComponent): Set<string> {
  const entities = new Set<string>();
  for (const frame of replay.frames) {
    for (const entity of frame.entities) {
      entities.add(entity.entityId);
    }
  }
  return entities;
}

/**
 * Get primary subject (entity with most screen time)
 */
export function getPrimarySubject(replay: VideoReplayComponent): string | null {
  const entityFrameCounts = new Map<string, number>();

  for (const frame of replay.frames) {
    for (const entity of frame.entities) {
      entityFrameCounts.set(entity.entityId, (entityFrameCounts.get(entity.entityId) ?? 0) + 1);
    }
  }

  let maxCount = 0;
  let primaryEntity: string | null = null;

  for (const [entityId, count] of entityFrameCounts) {
    if (count > maxCount) {
      maxCount = count;
      primaryEntity = entityId;
    }
  }

  return primaryEntity;
}

/**
 * Compress replay by removing redundant frames
 */
export function compressReplay(replay: VideoReplayComponent): void {
  if (replay.frames.length < 3) return;

  const compressed: ReplayFrame[] = [];
  compressed.push(replay.frames[0]!); // Always keep first frame

  for (let i = 1; i < replay.frames.length - 1; i++) {
    const prev = replay.frames[i - 1]!;
    const current = replay.frames[i]!;
    const _next = replay.frames[i + 1]!;

    // Keep frame if camera moved significantly
    const cameraMoved =
      Math.abs(current.cameraX - prev.cameraX) > 5 ||
      Math.abs(current.cameraY - prev.cameraY) > 5 ||
      Math.abs(current.cameraAngle - prev.cameraAngle) > 0.1;

    // Keep frame if entity count changed
    const entityCountChanged = current.entities.length !== prev.entities.length;

    // Keep frame if entities moved significantly
    const entitiesMoved = current.entities.some((entity, idx) => {
      const prevEntity = prev.entities[idx];
      if (!prevEntity) return true;
      const dx = entity.x - prevEntity.x;
      const dy = entity.y - prevEntity.y;
      return Math.sqrt(dx * dx + dy * dy) > 10;
    });

    if (cameraMoved || entityCountChanged || entitiesMoved) {
      compressed.push(current);
    }
  }

  compressed.push(replay.frames[replay.frames.length - 1]!); // Always keep last frame

  replay.frames = compressed;
  updateReplayMetadata(replay);
}
