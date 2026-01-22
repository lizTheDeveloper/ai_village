/**
 * Fates Council Capability - Dev tools for testing FatesCouncilSystem
 *
 * Provides testing infrastructure for exotic/epic plot assignment
 * without needing to reach library/university tech unlock.
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';
import * as http from 'http';

/**
 * Helper function to fetch data from the metrics server
 */
async function fetchFromMetricsServer(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8766,
      path,
      method: 'GET',
    };

    const req = http.request(options, (res) => {
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

    req.end();
  });
}

/**
 * Helper function to POST to metrics server
 */
async function postToMetricsServer(path: string, body: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 8766,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };

    const req = http.request(options, (res) => {
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

    req.write(bodyStr);
    req.end();
  });
}

const fatesCouncilCapability = defineCapability({
  id: 'fates-council',
  name: 'Fates Council',
  description: 'Dev tools for testing FatesCouncilSystem - exotic/epic plot assignment',
  category: 'systems',

  tab: {
    icon: '✂️',
    priority: 85,
  },

  queries: [
    defineQuery({
      id: 'fates-status',
      name: 'Fates Status',
      description: 'Check if FatesCouncilSystem is enabled and configured',
      params: [],
      requiresGame: true,
      handler: async (params, gameClient, context) => {
        try {
          const response = await fetchFromMetricsServer('/api/game/fates-status');
          return response;
        } catch (error) {
          return {
            error: `Failed to fetch Fates status: ${error}`,
            fallback: 'Use console: game.getFatesStatus()'
          };
        }
      },
      renderResult: (data: unknown) => {
        const result = data as {
          enabled?: boolean;
          llmConfigured?: boolean;
          lastCouncilDay?: number;
          currentDay?: number;
          error?: string;
          fallback?: string;
        };

        if (result.error) {
          return `Error: ${result.error}\n${result.fallback || ''}`;
        }

        let output = `FATES COUNCIL STATUS\n\n`;
        output += `System Enabled: ${result.enabled ? 'YES' : 'NO'}\n`;
        output += `LLM Configured: ${result.llmConfigured ? 'YES' : 'NO'}\n`;
        output += `Last Council Day: ${result.lastCouncilDay ?? 'Never'}\n`;
        output += `Current Day: ${result.currentDay ?? 0}\n\n`;

        if (!result.enabled) {
          output += `⚠️  System disabled. Use "Force Enable" action to bypass tech requirements.\n`;
        }
        if (!result.llmConfigured) {
          output += `⚠️  No LLM provider configured. Council will use fallback responses.\n`;
        }

        return output;
      },
    }),

    defineQuery({
      id: 'council-history',
      name: 'Council History',
      description: 'View recent council meetings and decisions',
      params: [
        { name: 'limit', type: 'number', required: false, default: 5, description: 'Number of councils to retrieve' },
      ],
      requiresGame: true,
      handler: async (params, gameClient, context) => {
        try {
          const limit = params.limit || 5;
          const response = await fetchFromMetricsServer(`/api/game/fates-history?limit=${limit}`);
          return response;
        } catch (error) {
          return {
            error: `Failed to fetch council history: ${error}`,
            fallback: 'Use console: game.getFatesHistory()'
          };
        }
      },
      renderResult: (data: unknown) => {
        const result = data as {
          councils?: Array<{
            tick: number;
            day: number;
            exoticEventCount: number;
            storyHookCount: number;
            summary: string;
          }>;
          error?: string;
          fallback?: string;
        };

        if (result.error) {
          return `Error: ${result.error}\n${result.fallback || ''}`;
        }

        if (!result.councils || result.councils.length === 0) {
          return 'No council history found. Councils meet once per evening.';
        }

        let output = `COUNCIL HISTORY (${result.councils.length} meetings)\n\n`;

        for (const council of result.councils) {
          output += `Day ${council.day} (tick ${council.tick}):\n`;
          output += `  Exotic Events: ${council.exoticEventCount}\n`;
          output += `  Story Hooks: ${council.storyHookCount}\n`;
          output += `  Summary: ${council.summary}\n\n`;
        }

        return output;
      },
    }),

    defineQuery({
      id: 'exotic-events',
      name: 'Recent Exotic Events',
      description: 'List recent exotic events that could trigger councils',
      params: [
        { name: 'limit', type: 'number', required: false, default: 10, description: 'Number of events to show' },
      ],
      requiresGame: true,
      handler: async (params, gameClient, context) => {
        try {
          const limit = params.limit || 10;
          const response = await fetchFromMetricsServer(`/api/game/fates-events?limit=${limit}`);
          return response;
        } catch (error) {
          return {
            error: `Failed to fetch exotic events: ${error}`,
            fallback: 'Use console: game.getExoticEvents()'
          };
        }
      },
      renderResult: (data: unknown) => {
        const result = data as {
          events?: Array<{
            type: string;
            entityId: string;
            description: string;
            tick: number;
            severity: number;
          }>;
          error?: string;
          fallback?: string;
        };

        if (result.error) {
          return `Error: ${result.error}\n${result.fallback || ''}`;
        }

        if (!result.events || result.events.length === 0) {
          return 'No exotic events found. Create mock events with "Emit Mock Event" action.';
        }

        let output = `EXOTIC EVENTS (${result.events.length})\n\n`;

        for (const event of result.events) {
          output += `${event.type} (severity: ${(event.severity * 100).toFixed(0)}%)\n`;
          output += `  Entity: ${event.entityId}\n`;
          output += `  ${event.description}\n`;
          output += `  Tick: ${event.tick}\n\n`;
        }

        return output;
      },
    }),

    defineQuery({
      id: 'epic-eligible',
      name: 'Epic Eligible Souls',
      description: 'List souls that meet epic plot criteria (wisdom >= 100)',
      params: [],
      requiresGame: true,
      handler: async (params, gameClient, context) => {
        try {
          const response = await fetchFromMetricsServer('/api/game/fates-epic-eligible');
          return response;
        } catch (error) {
          return {
            error: `Failed to fetch epic eligible souls: ${error}`,
            fallback: 'Use console: game.getEpicEligible()'
          };
        }
      },
      renderResult: (data: unknown) => {
        const result = data as {
          souls?: Array<{
            entityId: string;
            name: string;
            wisdom: number;
            completedLargePlots: number;
            hasActiveEpic: boolean;
          }>;
          error?: string;
          fallback?: string;
        };

        if (result.error) {
          return `Error: ${result.error}\n${result.fallback || ''}`;
        }

        if (!result.souls || result.souls.length === 0) {
          return 'No souls eligible for epic plots. Requirements:\n- Wisdom >= 100\n- 5+ completed large/epic plots\n- No active epic plot';
        }

        let output = `EPIC ELIGIBLE SOULS (${result.souls.length})\n\n`;

        for (const soul of result.souls) {
          output += `${soul.name} (${soul.entityId.substring(0, 8)}...)\n`;
          output += `  Wisdom: ${soul.wisdom}\n`;
          output += `  Large Plots Completed: ${soul.completedLargePlots}\n`;
          output += `  Active Epic: ${soul.hasActiveEpic ? 'YES' : 'NO'}\n\n`;
        }

        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'enable-fates',
      name: 'Force Enable System',
      description: 'Enable FatesCouncilSystem (bypass tech unlock)',
      params: [],
      requiresGame: true,
      handler: async (params, gameClient, context) => {
        try {
          const response = await postToMetricsServer('/api/game/fates-enable', {});
          return response;
        } catch (error) {
          return {
            success: false,
            error: `Failed to enable Fates: ${error}`,
            fallback: 'Use console: game.enableFatesCouncil()'
          };
        }
      },
    }),

    defineAction({
      id: 'trigger-council',
      name: 'Trigger Council',
      description: 'Manually trigger a Fates council meeting',
      params: [
        {
          name: 'forceLLM',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Use real LLM even if not configured'
        },
        {
          name: 'mockEvents',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Create mock exotic events first'
        },
      ],
      requiresGame: true,
      handler: async (params, gameClient, context) => {
        try {
          const response = await postToMetricsServer('/api/game/fates-trigger', {
            forceLLM: params.forceLLM || false,
            mockEvents: params.mockEvents || false,
          });
          return response;
        } catch (error) {
          return {
            success: false,
            error: `Failed to trigger council: ${error}`,
            fallback: 'Use console: game.triggerFatesCouncil({ forceLLM: true })'
          };
        }
      },
    }),

    defineAction({
      id: 'grant-wisdom',
      name: 'Grant Wisdom',
      description: 'Set soul wisdom level to test epic assignments',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, entityType: 'agent', description: 'Soul entity ID' },
        { name: 'wisdom', type: 'number', required: true, default: 100, description: 'Wisdom level (0-200)' },
      ],
      requiresGame: true,
      handler: async (params, gameClient, context) => {
        try {
          const response = await postToMetricsServer('/api/game/fates-grant-wisdom', {
            entityId: params.entityId,
            wisdom: params.wisdom,
          });
          return response;
        } catch (error) {
          return {
            success: false,
            error: `Failed to grant wisdom: ${error}`,
            fallback: `Use console: game.setWisdom('${params.entityId}', ${params.wisdom})`
          };
        }
      },
    }),

    defineAction({
      id: 'emit-mock-event',
      name: 'Emit Mock Event',
      description: 'Create a fake exotic event for testing',
      params: [
        {
          name: 'eventType',
          type: 'select',
          required: true,
          options: [
            { value: 'deity_relationship_critical', label: 'Deity Relationship Critical' },
            { value: 'multiverse_invasion', label: 'Multiverse Invasion' },
            { value: 'paradigm_conflict', label: 'Magic Paradigm Conflict' },
            { value: 'dimensional_encounter', label: 'Dimensional Encounter' },
            { value: 'political_elevation', label: 'Political Elevation' },
            { value: 'time_paradox', label: 'Time Paradox' },
            { value: 'prophecy_given', label: 'Prophecy Given' },
            { value: 'champion_chosen', label: 'Champion Chosen' },
          ],
          description: 'Type of exotic event'
        },
        { name: 'entityId', type: 'entity-id', required: false, entityType: 'agent', description: 'Affected entity (optional)' },
      ],
      requiresGame: true,
      handler: async (params, gameClient, context) => {
        try {
          const response = await postToMetricsServer('/api/game/fates-mock-event', {
            eventType: params.eventType,
            entityId: params.entityId || undefined,
          });
          return response;
        } catch (error) {
          return {
            success: false,
            error: `Failed to emit mock event: ${error}`,
            fallback: `Use console: game.createMockExoticEvent('${params.eventType}')`
          };
        }
      },
    }),

    defineAction({
      id: 'clear-cooldown',
      name: 'Clear Council Cooldown',
      description: 'Reset last council day to allow immediate re-run',
      params: [],
      requiresGame: true,
      handler: async (params, gameClient, context) => {
        try {
          const response = await postToMetricsServer('/api/game/fates-clear-cooldown', {});
          return response;
        } catch (error) {
          return {
            success: false,
            error: `Failed to clear cooldown: ${error}`,
            fallback: 'Use console: game.clearFatesCooldown()'
          };
        }
      },
    }),
  ],
});

capabilityRegistry.register(fatesCouncilCapability);
