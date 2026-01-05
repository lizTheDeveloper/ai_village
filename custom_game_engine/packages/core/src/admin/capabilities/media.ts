/**
 * Media Capability - Soul Gallery, Interdimensional Cable, and recordings
 *
 * Includes:
 * - Soul Gallery: Browse souls and their sprites per universe
 * - Interdimensional Cable: All TV recordings from all universes
 * - Recording management
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction, defineLink } from '../CapabilityRegistry.js';

const mediaCapability = defineCapability({
  id: 'media',
  name: 'Media & Souls',
  description: 'Soul Gallery, Interdimensional Cable, and game recordings',
  category: 'media',

  tab: {
    icon: '📺',
    priority: 55,
  },

  queries: [
    defineQuery({
      id: 'list-souls',
      name: 'List All Souls',
      description: 'List all souls across all universes',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Filter by session/universe' },
        { name: 'hasSprite', type: 'boolean', required: false, description: 'Only souls with sprites' },
        { name: 'minIncarnations', type: 'number', required: false, description: 'Minimum incarnation count' },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to soul-repository/index.json' };
      },
    }),

    defineQuery({
      id: 'get-soul',
      name: 'Get Soul Details',
      description: 'Get full details for a specific soul',
      params: [
        { name: 'soulId', type: 'string', required: true, description: 'Soul ID' },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to soul-repository/{soulId}.json' };
      },
    }),

    defineQuery({
      id: 'list-recordings',
      name: 'List Recordings',
      description: 'List all game recordings (TV shows)',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Filter by session' },
        { name: 'type', type: 'select', required: false, options: [
          { value: 'all', label: 'All' },
          { value: 'combat', label: 'Combat' },
          { value: 'event', label: 'Events' },
          { value: 'scene', label: 'Scenes' },
        ], description: 'Recording type' },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        return { message: 'Scan mock-recordings directory' };
      },
    }),

    defineQuery({
      id: 'get-recording',
      name: 'Get Recording',
      description: 'Get a specific recording data',
      params: [
        { name: 'recordingId', type: 'string', required: true, description: 'Recording ID' },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        return { message: 'Load recording JSON' };
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'generate-soul-sprite',
      name: 'Generate Soul Sprite',
      description: 'Queue sprite generation for a soul based on their description',
      params: [
        { name: 'soulId', type: 'string', required: true, description: 'Soul ID' },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to soul gallery sprite generator' };
      },
    }),

    defineAction({
      id: 'start-recording',
      name: 'Start Recording',
      description: 'Start recording the current game state (creates a TV show)',
      params: [
        { name: 'title', type: 'string', required: true, description: 'Recording title' },
        { name: 'description', type: 'string', required: false, description: 'Recording description' },
        { name: 'duration', type: 'number', required: false, default: 60, description: 'Max duration in seconds' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Start VideoReplayComponent recording' };
      },
    }),

    defineAction({
      id: 'stop-recording',
      name: 'Stop Recording',
      description: 'Stop the current recording',
      params: [],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Stop VideoReplayComponent recording' };
      },
    }),

    defineAction({
      id: 'delete-recording',
      name: 'Delete Recording',
      description: 'Delete a recording (moves to corrupted/rejected)',
      dangerous: true,
      params: [
        { name: 'recordingId', type: 'string', required: true, description: 'Recording ID to delete' },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        // Per CLAUDE.md - nothing is ever deleted, just marked as corrupted
        return { success: true, message: 'Mark as corrupted, move to rejected realm' };
      },
    }),
  ],

  links: [
    defineLink({
      id: 'soul-gallery',
      name: 'Soul Gallery',
      description: 'Eternal Archive of Reincarnated Souls - browse all souls and their sprites',
      url: '/soul-gallery.html',
      icon: '✦',
      embeddable: true,
    }),
    defineLink({
      id: 'soul-gallery-universe',
      name: 'Soul Gallery (Universe)',
      description: 'Souls for a specific universe',
      url: '/soul-gallery.html?session={session}',
      icon: '🌌',
      embeddable: true,
    }),
    defineLink({
      id: 'interdimensional-cable',
      name: 'Interdimensional Cable',
      description: 'All TV recordings from infinite realities',
      url: '/interdimensional-cable.html',
      icon: '📺',
      embeddable: true,
    }),
    defineLink({
      id: 'cable-universe',
      name: 'Interdimensional Cable (Universe)',
      description: 'Recordings from a specific universe',
      url: '/interdimensional-cable.html?session={session}',
      icon: '📡',
      embeddable: true,
    }),
  ],
});

capabilityRegistry.register(mediaCapability);
