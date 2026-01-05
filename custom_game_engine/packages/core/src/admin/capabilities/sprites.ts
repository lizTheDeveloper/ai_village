/**
 * Sprites Capability - Manage PixelLab sprite generation
 *
 * This is the general sprite gallery for all PixelLab-generated sprites
 * (characters, animals, tiles, etc). Soul Gallery is separate and shows
 * sprites organized by soul/reincarnation.
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction, defineLink } from '../CapabilityRegistry.js';

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
        return { message: 'Delegate to sprite directory scan' };
      },
    }),

    defineQuery({
      id: 'queue-status',
      name: 'Generation Queue Status',
      description: 'Get current sprite generation queue status',
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/sprites/queue' };
      },
    }),

    defineQuery({
      id: 'daemon-status',
      name: 'PixelLab Daemon Status',
      description: 'Check if the PixelLab daemon is running',
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        return { message: 'Check pixellab-daemon.pid' };
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
        return { success: true, message: 'Delegate to /api/sprites/generate' };
      },
    }),

    defineAction({
      id: 'regenerate-sprite',
      name: 'Regenerate Sprite',
      description: 'Delete and regenerate an existing sprite',
      dangerous: true,
      params: [
        { name: 'folderId', type: 'string', required: true, description: 'Sprite folder ID to regenerate' },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delete existing and requeue' };
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
        return { success: true, message: 'Clear sprite-generation-queue.json' };
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
        return { success: true, message: 'Delegate to /api/animations/generate' };
      },
    }),
  ],

  links: [
    defineLink({
      id: 'sprite-gallery',
      name: 'Sprite Gallery',
      description: 'Visual browser for all generated sprites',
      url: '/sprites-gallery.html',
      icon: '🖼️',
      embeddable: true,
    }),
    defineLink({
      id: 'pixellab-dashboard',
      name: 'PixelLab Characters',
      description: 'View all PixelLab characters in your account',
      url: 'https://app.pixellab.ai/characters',
      icon: '🎮',
      embeddable: false,
    }),
  ],
});

capabilityRegistry.register(spritesCapability);
