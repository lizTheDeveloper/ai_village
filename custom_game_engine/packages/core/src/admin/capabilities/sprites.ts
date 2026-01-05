/**
 * Sprites Capability - Manage PixelLab sprite generation
 *
 * This is the general sprite gallery for all PixelLab-generated sprites
 * (characters, animals, tiles, etc). Soul Gallery is separate and shows
 * sprites organized by soul/reincarnation.
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction, defineLink } from '../CapabilityRegistry.js';

const METRICS_SERVER = 'http://localhost:8766';

// Helper to make API calls to metrics server
async function metricsApiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${METRICS_SERVER}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  return response.json();
}

const spritesCapability = defineCapability({
  id: 'sprites',
  name: 'Sprites',
  description: 'Manage PixelLab sprite generation - queue status, regenerate, and browse',
  category: 'media',

  tab: {
    icon: '🎨',
    priority: 50,
  },

  queries: [
    defineQuery({
      id: 'list-sprites',
      name: 'List Generated Sprites',
      description: 'List all sprites in the assets directory',
      params: [
        { name: 'type', type: 'select', required: false, options: [
          { value: 'all', label: 'All' },
          { value: 'character', label: 'Characters' },
          { value: 'animal', label: 'Animals' },
          { value: 'soul', label: 'Souls' },
          { value: 'tile', label: 'Tiles' },
        ], description: 'Filter by sprite type' },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        const data = await metricsApiCall('/api/pixellab/sprites');
        let sprites = data.sprites || [];

        // Filter by type if specified
        const filterType = params.type as string | undefined;
        if (filterType && filterType !== 'all') {
          sprites = sprites.filter((s: any) => s.category === filterType);
        }

        return {
          total: sprites.length,
          sprites: sprites.map((s: any) => ({
            id: s.id,
            category: s.category,
            description: s.description,
            hasImage: s.hasImage,
            versions: s.versions?.length || 1,
          })),
        };
      },
    }),

    defineQuery({
      id: 'queue-status',
      name: 'Generation Queue Status',
      description: 'Get current sprite generation queue status',
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        const data = await metricsApiCall('/api/sprites/queue');
        return {
          pending: data.pending || 0,
          processing: data.processing || 0,
          completed: data.completed || 0,
          failed: data.failed || 0,
          queue: data.queue || [],
        };
      },
    }),

    defineQuery({
      id: 'daemon-status',
      name: 'PixelLab Daemon Status',
      description: 'Check if the PixelLab daemon is running',
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        const data = await metricsApiCall('/api/pixellab/daemon-status');
        return {
          running: data.running,
          pid: data.pid,
          pending: data.pending,
          message: data.message,
        };
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'generate-sprite',
      name: 'Generate Sprite',
      description: 'Queue a new sprite for generation',
      params: [
        { name: 'folderId', type: 'string', required: true, description: 'Unique folder ID for the sprite' },
        { name: 'description', type: 'string', required: true, description: 'Description for PixelLab AI' },
        { name: 'type', type: 'select', required: false, default: 'character', options: [
          { value: 'character', label: 'Character (8 directions)' },
          { value: 'animal', label: 'Animal' },
          { value: 'tile', label: 'Isometric Tile' },
        ], description: 'Sprite type' },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        const folderId = params.folderId as string;
        const description = params.description as string;
        const spriteType = (params.type as string) || 'character';

        const result = await metricsApiCall('/api/sprites/generate', {
          method: 'POST',
          body: JSON.stringify({
            folderId,
            description,
            type: spriteType,
          }),
        });

        return {
          success: true,
          message: `Queued sprite generation: ${folderId}`,
          queuePosition: result.position,
          folderId: result.folderId,
        };
      },
    }),

    defineAction({
      id: 'regenerate-sprite',
      name: 'Regenerate Sprite',
      description: 'Create a new version of an existing sprite (old version is preserved)',
      dangerous: true,
      params: [
        { name: 'folderId', type: 'string', required: true, description: 'Sprite folder ID to regenerate' },
        { name: 'description', type: 'string', required: false, description: 'New description (optional, uses existing if not provided)' },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        const folderId = params.folderId as string;
        const description = params.description as string | undefined;

        const result = await metricsApiCall('/api/pixellab/regenerate', {
          method: 'POST',
          body: JSON.stringify({
            folderId,
            description,
          }),
        });

        return {
          success: result.success,
          message: result.success
            ? `Queued regeneration for ${folderId}. Old version saved as: ${result.versionedAs}`
            : result.error,
          versionedAs: result.versionedAs,
          queuedNew: result.queuedNew,
        };
      },
    }),

    defineAction({
      id: 'clear-queue',
      name: 'Clear Generation Queue',
      description: 'Clear all pending sprite generation jobs',
      dangerous: true,
      requiresConfirmation: true,
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        const result = await metricsApiCall('/api/pixellab/clear-queue', {
          method: 'POST',
        });

        return {
          success: result.success,
          message: result.success
            ? `Cleared ${result.clearedCount} pending jobs`
            : result.error,
          clearedCount: result.clearedCount,
        };
      },
    }),

    defineAction({
      id: 'start-daemon',
      name: 'Start PixelLab Daemon',
      description: 'Start the background sprite generation daemon',
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        const result = await metricsApiCall('/api/pixellab/daemon/start', {
          method: 'POST',
        });

        return {
          success: result.success,
          message: result.message,
          pid: result.pid,
        };
      },
    }),

    defineAction({
      id: 'stop-daemon',
      name: 'Stop PixelLab Daemon',
      description: 'Stop the background sprite generation daemon',
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        const result = await metricsApiCall('/api/pixellab/daemon/stop', {
          method: 'POST',
        });

        return {
          success: result.success,
          message: result.message,
        };
      },
    }),

    defineAction({
      id: 'generate-animation',
      name: 'Generate Animation',
      description: 'Queue animation generation for an existing character',
      params: [
        { name: 'folderId', type: 'string', required: true, description: 'Character folder ID' },
        { name: 'animationName', type: 'select', required: true, options: [
          { value: 'walking-8-frames', label: 'Walking (8 frames)' },
          { value: 'running-8-frames', label: 'Running (8 frames)' },
          { value: 'breathing-idle', label: 'Idle Breathing' },
          { value: 'cross-punch', label: 'Punch' },
          { value: 'high-kick', label: 'Kick' },
        ], description: 'Animation type' },
        { name: 'actionDescription', type: 'string', required: false, description: 'Custom action description' },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        const folderId = params.folderId as string;
        const animationName = params.animationName as string;
        const actionDescription = params.actionDescription as string | undefined;

        const result = await metricsApiCall('/api/pixellab/animation', {
          method: 'POST',
          body: JSON.stringify({
            folderId,
            animationName,
            actionDescription,
          }),
        });

        return {
          success: result.success,
          message: result.success
            ? `Queued animation ${animationName} for ${folderId}`
            : result.error,
          animationId: result.animationId,
        };
      },
    }),
  ],

  links: [
    defineLink({
      id: 'sprite-manager',
      name: 'Sprite Manager',
      description: 'Browse, regenerate, and manage all generated sprites',
      url: 'http://localhost:8766/sprites.html',  // Uses metrics server (always available)
      icon: '🖼️',
      embeddable: false,
    }),
    defineLink({
      id: 'pixellab-dashboard',
      name: 'PixelLab Account',
      description: 'View all PixelLab characters in your account',
      url: 'https://app.pixellab.ai/characters',
      icon: '🎮',
      embeddable: false,
    }),
  ],
});

capabilityRegistry.register(spritesCapability);
