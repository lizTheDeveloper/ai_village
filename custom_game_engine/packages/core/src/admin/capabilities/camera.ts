/**
 * Camera Capability - Control player view and focus
 *
 * Provides admin interface for:
 * - Camera position and zoom
 * - Focus on entities or locations
 * - Follow mode for agents
 * - Viewport information
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Option Definitions
// ============================================================================

const ZOOM_PRESET_OPTIONS = [
  { value: '0.25', label: 'Very Far (0.25x)' },
  { value: '0.5', label: 'Far (0.5x)' },
  { value: '1', label: 'Normal (1x)' },
  { value: '2', label: 'Close (2x)' },
  { value: '4', label: 'Very Close (4x)' },
];

const FOLLOW_MODE_OPTIONS = [
  { value: 'none', label: 'No Follow' },
  { value: 'center', label: 'Keep Centered' },
  { value: 'loose', label: 'Loose Follow' },
  { value: 'edge', label: 'Follow at Edge' },
];

// ============================================================================
// Camera Capability Definition
// ============================================================================

const cameraCapability = defineCapability({
  id: 'camera',
  name: 'Camera & View',
  description: 'Control player view - camera position, zoom, focus, follow mode',
  category: 'systems',

  tab: {
    icon: '📷',
    priority: 60,
  },

  queries: [
    defineQuery({
      id: 'get-camera-state',
      name: 'Get Camera State',
      description: 'Get current camera position, zoom, and settings',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/camera' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          x?: number;
          y?: number;
          zoom?: number;
          followingEntity?: { id: string; name: string };
          followMode?: string;
          viewportWidth?: number;
          viewportHeight?: number;
        };

        let output = 'CAMERA STATE\n\n';

        output += `Position: (${result.x?.toFixed(1) ?? 0}, ${result.y?.toFixed(1) ?? 0})\n`;
        output += `Zoom: ${result.zoom?.toFixed(2) ?? 1}x\n`;
        output += `Viewport: ${result.viewportWidth ?? 0} x ${result.viewportHeight ?? 0}\n\n`;

        if (result.followingEntity) {
          output += `Following: ${result.followingEntity.name}\n`;
          output += `Follow Mode: ${result.followMode ?? 'center'}\n`;
        } else {
          output += 'Following: None\n';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-visible-entities',
      name: 'Get Visible Entities',
      description: 'Get entities currently visible in the viewport',
      params: [
        { name: 'entityType', type: 'string', required: false, description: 'Filter by type (agent, building, etc.)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/camera/visible' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          count?: number;
          entities?: Array<{
            id: string;
            name: string;
            type: string;
            x: number;
            y: number;
          }>;
        };

        let output = 'VISIBLE ENTITIES\n\n';

        if (result.entities?.length) {
          const byType = new Map<string, typeof result.entities>();
          result.entities.forEach(e => {
            const list = byType.get(e.type) || [];
            list.push(e);
            byType.set(e.type, list);
          });

          byType.forEach((entities, type) => {
            output += `${type.toUpperCase()} (${entities.length})\n`;
            entities.slice(0, 10).forEach(e => {
              output += `  ${e.name} at (${e.x.toFixed(0)}, ${e.y.toFixed(0)})\n`;
            });
            if (entities.length > 10) {
              output += `  ... and ${entities.length - 10} more\n`;
            }
            output += '\n';
          });

          output += `Total: ${result.count ?? result.entities.length}`;
        } else {
          output += 'No entities in view';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-world-bounds',
      name: 'Get World Bounds',
      description: 'Get the world boundaries for camera navigation',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/world/bounds' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          minX?: number;
          maxX?: number;
          minY?: number;
          maxY?: number;
          width?: number;
          height?: number;
        };

        let output = 'WORLD BOUNDS\n\n';

        output += `X Range: ${result.minX ?? 0} to ${result.maxX ?? 0}\n`;
        output += `Y Range: ${result.minY ?? 0} to ${result.maxY ?? 0}\n`;
        output += `Size: ${result.width ?? 0} x ${result.height ?? 0} tiles\n`;

        return output;
      },
    }),

    defineQuery({
      id: 'get-points-of-interest',
      name: 'Get Points of Interest',
      description: 'Get notable locations the camera can jump to',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/poi' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          points?: Array<{
            name: string;
            type: string;
            x: number;
            y: number;
            description?: string;
          }>;
        };

        let output = 'POINTS OF INTEREST\n\n';

        if (result.points?.length) {
          result.points.forEach(p => {
            output += `${p.name} [${p.type}]\n`;
            output += `  Location: (${p.x}, ${p.y})\n`;
            if (p.description) {
              output += `  ${p.description}\n`;
            }
            output += '\n';
          });
        } else {
          output += 'No points of interest';
        }

        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'move-camera',
      name: 'Move Camera',
      description: 'Move the camera to a specific position',
      params: [
        { name: 'x', type: 'number', required: true, description: 'X coordinate' },
        { name: 'y', type: 'number', required: true, description: 'Y coordinate' },
        { name: 'smooth', type: 'boolean', required: false, default: true, description: 'Smooth transition' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Moved camera to (${params.x}, ${params.y})` };
      },
    }),

    defineAction({
      id: 'set-zoom',
      name: 'Set Zoom',
      description: 'Set camera zoom level',
      params: [
        { name: 'zoom', type: 'number', required: true, description: 'Zoom level (0.1 to 10)' },
        { name: 'smooth', type: 'boolean', required: false, default: true, description: 'Smooth transition' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Set zoom to ${params.zoom}x` };
      },
    }),

    defineAction({
      id: 'set-zoom-preset',
      name: 'Set Zoom Preset',
      description: 'Set camera zoom to a preset level',
      params: [
        {
          name: 'preset', type: 'select', required: true,
          options: ZOOM_PRESET_OPTIONS,
          description: 'Zoom preset',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Set zoom to ${params.preset}x` };
      },
    }),

    defineAction({
      id: 'focus-on-entity',
      name: 'Focus on Entity',
      description: 'Center camera on a specific entity',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Entity to focus on' },
        { name: 'zoom', type: 'number', required: false, description: 'Optional zoom level' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Focused on entity ${params.entityId}` };
      },
    }),

    defineAction({
      id: 'follow-entity',
      name: 'Follow Entity',
      description: 'Make camera follow an entity',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Entity to follow' },
        {
          name: 'mode', type: 'select', required: false,
          options: FOLLOW_MODE_OPTIONS,
          default: 'center',
          description: 'Follow mode',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Now following ${params.entityId} (${params.mode})` };
      },
    }),

    defineAction({
      id: 'stop-following',
      name: 'Stop Following',
      description: 'Stop camera from following any entity',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: 'Stopped following' };
      },
    }),

    defineAction({
      id: 'jump-to-poi',
      name: 'Jump to POI',
      description: 'Jump camera to a named point of interest',
      params: [
        { name: 'poiName', type: 'string', required: true, description: 'Point of interest name' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Jumped to ${params.poiName}` };
      },
    }),

    defineAction({
      id: 'highlight-entity',
      name: 'Highlight Entity',
      description: 'Temporarily highlight an entity on screen',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Entity to highlight' },
        { name: 'durationMs', type: 'number', required: false, default: 3000, description: 'Duration in ms' },
        { name: 'color', type: 'string', required: false, default: '#ffff00', description: 'Highlight color' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Highlighting ${params.entityId}` };
      },
    }),

    defineAction({
      id: 'shake-camera',
      name: 'Shake Camera',
      description: 'Apply a camera shake effect (for emphasis)',
      params: [
        { name: 'intensity', type: 'number', required: false, default: 5, description: 'Shake intensity (1-10)' },
        { name: 'durationMs', type: 'number', required: false, default: 500, description: 'Duration in ms' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Camera shake (intensity: ${params.intensity})` };
      },
    }),
  ],
});

capabilityRegistry.register(cameraCapability);
