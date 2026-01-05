/**
 * Saves Capability - Time travel and universe branching
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

const savesCapability = defineCapability({
  id: 'saves',
  name: 'Time Travel',
  description: 'Save/load game state, rewind time, and branch universes',
  category: 'infrastructure',

  tab: {
    icon: '⏱️',
    priority: 70,
  },

  queries: [
    defineQuery({
      id: 'list-saves',
      name: 'List Saves',
      description: 'List all save points for a session',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID (default: active)' },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/saves' };
      },
    }),

    defineQuery({
      id: 'get-save',
      name: 'Get Save Details',
      description: 'Get metadata for a specific save point',
      params: [
        { name: 'session', type: 'session-id', required: true, description: 'Session ID' },
        { name: 'saveName', type: 'string', required: true, description: 'Save name' },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        return { message: 'Load save metadata' };
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'save',
      name: 'Create Save Point',
      description: 'Save current game state as a checkpoint',
      params: [
        { name: 'name', type: 'string', required: true, description: 'Save name' },
        { name: 'description', type: 'string', required: false, description: 'Optional description' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/save' };
      },
    }),

    defineAction({
      id: 'load',
      name: 'Load Save (Rewind)',
      description: 'Rewind time to a previous save point',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'session', type: 'session-id', required: true, description: 'Session ID' },
        { name: 'saveName', type: 'string', required: true, description: 'Save to load' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/load' };
      },
    }),

    defineAction({
      id: 'fork',
      name: 'Fork Universe',
      description: 'Create a new universe branch from a save point',
      params: [
        { name: 'session', type: 'session-id', required: true, description: 'Source session' },
        { name: 'saveName', type: 'string', required: true, description: 'Save to fork from' },
        { name: 'newName', type: 'string', required: false, description: 'Name for new universe' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/fork' };
      },
    }),

    defineAction({
      id: 'delete-save',
      name: 'Delete Save',
      description: 'Delete a save point (marks as corrupted, not truly deleted)',
      dangerous: true,
      params: [
        { name: 'session', type: 'session-id', required: true, description: 'Session ID' },
        { name: 'saveName', type: 'string', required: true, description: 'Save to delete' },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        // Per CLAUDE.md - nothing is ever deleted
        return { success: true, message: 'Mark save as corrupted (not deleted)' };
      },
    }),

    defineAction({
      id: 'auto-save',
      name: 'Trigger Auto-Save',
      description: 'Force an immediate auto-save',
      params: [],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Trigger auto-save' };
      },
    }),
  ],
});

capabilityRegistry.register(savesCapability);
