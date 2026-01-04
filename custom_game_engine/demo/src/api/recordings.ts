/**
 * Recordings API - Bridge between ECS world and Interdimensional Cable
 *
 * Queries the game world for VideoReplayComponent and RecordingComponent data,
 * then formats it for playback in Interdimensional Cable.
 */

import type { World } from '@ai-village/core';
import type { VideoReplayComponent } from '@ai-village/core';
import type { RecordingComponent } from '@ai-village/core';

/**
 * Recording metadata for Interdimensional Cable
 */
export interface CableRecording {
  recordingId: string;
  title: string;
  description: string;
  recordedBy: string;
  recordedAt: number;
  duration: number; // Duration in ticks
  quality: number;
  frames: any[]; // VideoReplayComponent frames
}

/**
 * Get the game world from the globally exposed gameLoop.
 * Returns null if gameLoop hasn't been initialized yet.
 */
function getWorld(): World | null {
  const gameLoop = (window as any).__gameLoop;
  if (!gameLoop || !gameLoop.world) {
    console.warn('[RecordingsAPI] GameLoop not yet initialized');
    return null;
  }
  return gameLoop.world;
}

/**
 * Get all recordings from the game world.
 * Returns both completed VideoReplayComponents and their metadata from RecordingComponents.
 */
export function getAllRecordings(): CableRecording[] {
  const world = getWorld();
  if (!world) return [];

  const recordings: CableRecording[] = [];

  // Query for all entities with VideoReplayComponent
  const entities = world.query().with('video_replay').executeEntities();


  for (const entity of entities) {
    try {
      const videoReplay = entity.getComponent<VideoReplayComponent>('video_replay');
      if (!videoReplay) continue;

      // Only include completed recordings
      if (videoReplay.status !== 'completed') {
        continue;
      }

      // Try to find associated RecordingComponent for additional metadata
      let recording: RecordingComponent | null = null;
      const recordingEntity = world.getAllEntities().find((e) => {
        const rec = e.getComponent<RecordingComponent>('recording');
        return rec && rec.recordedBy === videoReplay.recordedBy;
      });

      if (recordingEntity) {
        recording = recordingEntity.getComponent<RecordingComponent>('recording');
      }

      // Format for Interdimensional Cable
      const cableRecording: CableRecording = {
        recordingId: videoReplay.recordingId,
        title: recording?.description || `Recording by ${videoReplay.recordedByName}`,
        description: recording?.description || `Captured ${videoReplay.frames.length} frames`,
        recordedBy: videoReplay.recordedByName,
        recordedAt: videoReplay.startTick * 50, // Convert ticks to milliseconds (20 TPS)
        duration: videoReplay.metadata.durationTicks,
        quality: videoReplay.metadata.quality,
        frames: videoReplay.frames, // Include all frames for playback
      };

      recordings.push(cableRecording);
    } catch (error) {
      console.error('[RecordingsAPI] Error processing recording:', error);
    }
  }

  return recordings;
}

/**
 * Get a specific recording by ID.
 */
export function getRecording(recordingId: string): CableRecording | null {
  const all = getAllRecordings();
  return all.find((r) => r.recordingId === recordingId) || null;
}

/**
 * Get recording count.
 */
export function getRecordingCount(): number {
  const world = getWorld();
  if (!world) return 0;

  const entities = world.query().with('video_replay').executeEntities();
  const completed = entities.filter((e) => {
    const replay = e.getComponent<VideoReplayComponent>('video_replay');
    return replay?.status === 'completed';
  });

  return completed.length;
}
