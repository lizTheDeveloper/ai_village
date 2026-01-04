/**
 * Interdimensional Cable App - Loads recordings from the game world
 */

import { getAllRecordings, getRecordingCount } from './src/api/recordings.js';

// Export for HTML to access
(window as any).loadRecordingsFromWorld = loadRecordingsFromWorld;

/**
 * Load recordings from the ECS world and add them to the SHOWS array
 */
export function loadRecordingsFromWorld() {
  console.log('[Interdimensional Cable] Loading recordings from game world...');

  const recordingCount = getRecordingCount();
  console.log(`[Interdimensional Cable] Found ${recordingCount} recordings in world`);

  if (recordingCount === 0) {
    console.log('[Interdimensional Cable] No recordings found - using mock data only');
    return [];
  }

  const recordings = getAllRecordings();
  console.log('[Interdimensional Cable] Loaded recordings:', recordings);

  // Convert to SHOWS format
  const shows = recordings.map((recording) => ({
    id: recording.recordingId,
    name: recording.title.toUpperCase(),
    description: recording.description,
    recordingData: recording, // Embed full recording data
    type: 'recording' as const,
  }));

  return shows;
}
