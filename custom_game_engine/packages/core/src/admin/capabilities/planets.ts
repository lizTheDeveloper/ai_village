/**
 * Planets Capability - Manage shared planet registry
 *
 * View, create, and manage planets that can be shared across
 * multiple save games and multiplayer sessions.
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';
import * as http from 'http';

/**
 * Helper function to fetch data from the metrics server
 */
async function fetchFromMetricsServer(path: string, options?: { method?: string; body?: any }): Promise<any> {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: 'localhost',
      port: 8766,
      path,
      method: options?.method || 'GET',
      headers: options?.body ? { 'Content-Type': 'application/json' } : {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options?.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

const planetsCapability = defineCapability({
  id: 'planets',
  name: 'Planets',
  description: 'Manage shared planet registry for multiplayer and save reuse',
  category: 'world',

  tab: {
    icon: '🪐',
    priority: 35,
  },

  queries: [
    defineQuery({
      id: 'list',
      name: 'List Planets',
      description: 'List all registered planets',
      params: [],
      requiresGame: false,
      handler: async (_params, _gameClient, _context) => {
        try {
          const result = await fetchFromMetricsServer('/api/planets');
          return result;
        } catch (error) {
          return { error: `Failed to fetch planets: ${error}` };
        }
      },
      renderResult: (data: unknown) => {
        const result = data as {
          planets?: Array<{
            id: string;
            name: string;
            type: string;
            chunkCount: number;
            hasBiosphere: boolean;
            saveCount: number;
            createdAt: number;
            lastAccessedAt: number;
          }>;
          error?: string;
        };

        if (result.error) {
          return `Error: ${result.error}`;
        }

        const planets = result.planets || [];

        if (planets.length === 0) {
          return `PLANETS\n\nNo planets registered yet.\n\nCreate a new game to generate your first planet.`;
        }

        let output = `PLANETS (${planets.length} registered)\n${'='.repeat(50)}\n\n`;

        for (const planet of planets) {
          const created = new Date(planet.createdAt).toLocaleDateString();
          const accessed = new Date(planet.lastAccessedAt).toLocaleDateString();

          output += `${planet.name} (${planet.type})\n`;
          output += `  ID: ${planet.id}\n`;
          output += `  Chunks: ${planet.chunkCount}\n`;
          output += `  Biosphere: ${planet.hasBiosphere ? '✅ Yes' : '❌ No'}\n`;
          output += `  Used by: ${planet.saveCount} saves\n`;
          output += `  Created: ${created}\n`;
          output += `  Last accessed: ${accessed}\n\n`;
        }

        return output;
      },
    }),

    defineQuery({
      id: 'stats',
      name: 'Planet Statistics',
      description: 'Get overall planet registry statistics',
      params: [],
      requiresGame: false,
      handler: async (_params, _gameClient, _context) => {
        try {
          const result = await fetchFromMetricsServer('/api/planets/stats');
          return result;
        } catch (error) {
          return { error: `Failed to fetch stats: ${error}` };
        }
      },
      renderResult: (data: unknown) => {
        const result = data as {
          stats?: {
            planetCount: number;
            totalChunks: number;
            totalBiospheres: number;
            totalNamedLocations: number;
          };
          error?: string;
        };

        if (result.error) {
          return `Error: ${result.error}`;
        }

        const stats = result.stats || { planetCount: 0, totalChunks: 0, totalBiospheres: 0, totalNamedLocations: 0 };

        let output = `PLANET REGISTRY STATISTICS\n${'='.repeat(50)}\n\n`;
        output += `Total Planets: ${stats.planetCount}\n`;
        output += `Total Chunks: ${stats.totalChunks}\n`;
        output += `Biospheres Generated: ${stats.totalBiospheres}\n`;
        output += `Named Locations: ${stats.totalNamedLocations}\n`;

        return output;
      },
    }),

    defineQuery({
      id: 'detail',
      name: 'Planet Detail',
      description: 'Get detailed information about a specific planet',
      params: [
        { name: 'planetId', type: 'string', required: true, description: 'Planet ID (e.g., planet:magical:abc123)' },
      ],
      requiresGame: false,
      handler: async (params, _gameClient, _context) => {
        try {
          const planetId = params.planetId as string;
          const result = await fetchFromMetricsServer(`/api/planet/${encodeURIComponent(planetId)}`);
          return result;
        } catch (error) {
          return { error: `Failed to fetch planet: ${error}` };
        }
      },
      renderResult: (data: unknown) => {
        const result = data as {
          planet?: {
            id: string;
            name: string;
            type: string;
            seed: string;
            chunkCount: number;
            hasBiosphere: boolean;
            saveCount: number;
            createdAt: number;
            lastAccessedAt: number;
            config?: {
              terrain?: { baseElevation?: number; waterLevel?: number };
              climate?: { temperatureBase?: number };
            };
          };
          error?: string;
        };

        if (result.error) {
          return `Error: ${result.error}`;
        }

        const planet = result.planet;
        if (!planet) {
          return `Planet not found`;
        }

        const created = new Date(planet.createdAt).toLocaleString();
        const accessed = new Date(planet.lastAccessedAt).toLocaleString();

        let output = `PLANET: ${planet.name}\n${'='.repeat(50)}\n\n`;
        output += `ID: ${planet.id}\n`;
        output += `Type: ${planet.type}\n`;
        output += `Seed: ${planet.seed}\n\n`;

        output += `STATISTICS\n`;
        output += `  Generated Chunks: ${planet.chunkCount}\n`;
        output += `  Has Biosphere: ${planet.hasBiosphere ? 'Yes' : 'No'}\n`;
        output += `  Used by Saves: ${planet.saveCount}\n\n`;

        output += `TIMELINE\n`;
        output += `  Created: ${created}\n`;
        output += `  Last Accessed: ${accessed}\n\n`;

        if (planet.config) {
          output += `CONFIGURATION\n`;
          if (planet.config.terrain) {
            output += `  Base Elevation: ${planet.config.terrain.baseElevation ?? 'default'}\n`;
            output += `  Water Level: ${planet.config.terrain.waterLevel ?? 'default'}\n`;
          }
          if (planet.config.climate) {
            output += `  Temperature: ${planet.config.climate.temperatureBase ?? 'default'}\n`;
          }
        }

        return output;
      },
    }),

    defineQuery({
      id: 'chunks',
      name: 'Planet Chunks',
      description: 'List generated chunks for a planet',
      params: [
        { name: 'planetId', type: 'string', required: true, description: 'Planet ID' },
      ],
      requiresGame: false,
      handler: async (params, _gameClient, _context) => {
        try {
          const planetId = params.planetId as string;
          const result = await fetchFromMetricsServer(`/api/planet/${encodeURIComponent(planetId)}/chunks`);
          return result;
        } catch (error) {
          return { error: `Failed to fetch chunks: ${error}` };
        }
      },
      renderResult: (data: unknown) => {
        const result = data as {
          chunks?: Array<{ x: number; y: number; modifiedAt: number; fileSize: number }>;
          error?: string;
        };

        if (result.error) {
          return `Error: ${result.error}`;
        }

        const chunks = result.chunks || [];

        if (chunks.length === 0) {
          return `No chunks generated yet.`;
        }

        let output = `GENERATED CHUNKS (${chunks.length})\n${'='.repeat(50)}\n\n`;

        // Group by y coordinate for a visual overview
        const byY = new Map<number, number[]>();
        for (const chunk of chunks) {
          if (!byY.has(chunk.y)) {
            byY.set(chunk.y, []);
          }
          byY.get(chunk.y)!.push(chunk.x);
        }

        // Find bounds
        const allX = chunks.map(c => c.x);
        const allY = chunks.map(c => c.y);
        const minX = Math.min(...allX);
        const maxX = Math.max(...allX);
        const minY = Math.min(...allY);
        const maxY = Math.max(...allY);

        output += `Bounds: X(${minX} to ${maxX}), Y(${minY} to ${maxY})\n\n`;

        // Simple visual map (limited to 20x10 for display)
        if (maxX - minX <= 20 && maxY - minY <= 10) {
          output += `Map:\n`;
          for (let y = minY; y <= maxY; y++) {
            let row = '';
            for (let x = minX; x <= maxX; x++) {
              const hasChunk = chunks.some(c => c.x === x && c.y === y);
              row += hasChunk ? '█' : '·';
            }
            output += `  ${row}\n`;
          }
          output += `\n`;
        }

        // Size statistics
        const totalSize = chunks.reduce((sum, c) => sum + (c.fileSize || 0), 0);
        output += `Total Size: ${(totalSize / 1024).toFixed(1)} KB\n`;
        output += `Avg Chunk Size: ${(totalSize / chunks.length / 1024).toFixed(2)} KB\n`;

        return output;
      },
    }),

    defineQuery({
      id: 'locations',
      name: 'Named Locations',
      description: 'List named locations on a planet',
      params: [
        { name: 'planetId', type: 'string', required: true, description: 'Planet ID' },
      ],
      requiresGame: false,
      handler: async (params, _gameClient, _context) => {
        try {
          const planetId = params.planetId as string;
          const result = await fetchFromMetricsServer(`/api/planet/${encodeURIComponent(planetId)}/locations`);
          return result;
        } catch (error) {
          return { error: `Failed to fetch locations: ${error}` };
        }
      },
      renderResult: (data: unknown) => {
        const result = data as {
          locations?: Array<{
            name: string;
            chunkX: number;
            chunkY: number;
            tileX?: number;
            tileY?: number;
            category?: string;
            description?: string;
            namedBy: string;
            namedAt: number;
          }>;
          error?: string;
        };

        if (result.error) {
          return `Error: ${result.error}`;
        }

        const locations = result.locations || [];

        if (locations.length === 0) {
          return `No named locations yet.\n\nLocations are named by players as they explore the world.`;
        }

        let output = `NAMED LOCATIONS (${locations.length})\n${'='.repeat(50)}\n\n`;

        for (const loc of locations) {
          const namedDate = new Date(loc.namedAt).toLocaleDateString();

          output += `📍 ${loc.name}`;
          if (loc.category) {
            output += ` [${loc.category}]`;
          }
          output += `\n`;
          output += `   Chunk: (${loc.chunkX}, ${loc.chunkY})`;
          if (loc.tileX !== undefined && loc.tileY !== undefined) {
            output += `, Tile: (${loc.tileX}, ${loc.tileY})`;
          }
          output += `\n`;
          if (loc.description) {
            output += `   "${loc.description}"\n`;
          }
          output += `   Named by: ${loc.namedBy} on ${namedDate}\n\n`;
        }

        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'delete',
      name: 'Delete Planet',
      description: 'Delete a planet (marks as deleted, preserves data)',
      params: [
        { name: 'planetId', type: 'string', required: true, description: 'Planet ID to delete' },
        { name: 'confirm', type: 'boolean', required: true, description: 'Confirm deletion' },
      ],
      requiresGame: false,
      dangerous: true,
      handler: async (params, _gameClient, _context) => {
        if (!params.confirm) {
          return { success: false, message: 'Deletion not confirmed' };
        }

        const planetId = params.planetId as string;

        try {
          await fetchFromMetricsServer(`/api/planet/${encodeURIComponent(planetId)}`, {
            method: 'DELETE',
          });
          return { success: true, message: `Planet ${planetId} marked as deleted` };
        } catch (error) {
          return { success: false, message: `Failed to delete planet: ${error}` };
        }
      },
    }),
  ],
});

// Register the capability
capabilityRegistry.register(planetsCapability);

export { planetsCapability };
