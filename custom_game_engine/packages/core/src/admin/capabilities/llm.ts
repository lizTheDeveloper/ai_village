/**
 * LLM Capability - Manage LLM providers, queue, and costs
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

const llmCapability = defineCapability({
  id: 'llm',
  name: 'LLM Queue',
  description: 'Manage LLM providers, queue status, and cost tracking',
  category: 'infrastructure',

  tab: {
    icon: '🤖',
    priority: 60,
  },

  queries: [
    defineQuery({
      id: 'providers',
      name: 'List Providers',
      description: 'List all configured LLM providers and their status',
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        try {
          const stats = await fetchFromMetricsServer('/api/llm/stats');
          return {
            providers: stats.providers || [],
            queues: stats.queues || {},
            summary: {
              totalProviders: (stats.providers || []).length,
              totalRequests: stats.metrics?.totalRequests || 0,
            }
          };
        } catch (error) {
          return { error: `Failed to fetch provider data: ${error}` };
        }
      },
      renderResult: (data: unknown) => {
        const result = data as {
          providers?: string[];
          queues?: Record<string, any>;
          summary?: { totalProviders: number; totalRequests: number };
          error?: string;
        };

        if (result.error) {
          return `Error: ${result.error}`;
        }

        let output = `LLM PROVIDERS\n\n`;
        output += `Total Providers: ${result.summary?.totalProviders || 0}\n`;
        output += `Total Requests: ${result.summary?.totalRequests || 0}\n\n`;

        if (result.queues) {
          for (const [provider, queueData] of Object.entries(result.queues)) {
            output += `${provider.toUpperCase()}:\n`;
            output += `  Queue Length: ${queueData.queueLength || 0}\n`;
            output += `  Rate Limited: ${queueData.rateLimited ? 'YES' : 'NO'}\n`;
            output += `  Wait Time: ${queueData.rateLimitWaitMs || 0}ms\n`;
            output += `  Utilization: ${((queueData.semaphoreUtilization || 0) * 100).toFixed(1)}%\n\n`;
          }
        }

        return output;
      },
    }),

    defineQuery({
      id: 'queue-stats',
      name: 'Queue Statistics',
      description: 'Get current queue lengths and rate limit status',
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        try {
          const stats = await fetchFromMetricsServer('/api/llm/stats');
          return stats;
        } catch (error) {
          return { error: `Failed to fetch queue stats: ${error}` };
        }
      },
    }),

    defineQuery({
      id: 'costs',
      name: 'Cost Tracking',
      description: 'Get LLM usage costs per provider and session',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Filter by session' },
        { name: 'provider', type: 'select', required: false, options: [
          { value: 'all', label: 'All Providers' },
          { value: 'groq', label: 'Groq' },
          { value: 'cerebras', label: 'Cerebras' },
        ], description: 'Filter by provider' },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        try {
          // TODO: Implement cost tracking API endpoint
          return { message: 'Cost tracking coming soon - API endpoint needed' };
        } catch (error) {
          return { error: `Failed to fetch costs: ${error}` };
        }
      },
    }),

    defineQuery({
      id: 'session-cooldowns',
      name: 'Session Cooldowns',
      description: 'Get cooldown status for each game session',
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        try {
          const stats = await fetchFromMetricsServer('/api/llm/stats');
          return {
            sessions: stats.sessions || {},
            cooldowns: 'See LLM scheduler metrics in stats',
          };
        } catch (error) {
          return { error: `Failed to fetch cooldowns: ${error}` };
        }
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'set-agent-llm',
      name: 'Set Agent LLM Config',
      description: 'Configure custom LLM settings for a specific agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'provider', type: 'select', required: false, options: [
          { value: 'groq', label: 'Groq' },
          { value: 'cerebras', label: 'Cerebras' },
        ], description: 'Preferred provider' },
        { name: 'model', type: 'string', required: false, description: 'Model override' },
        { name: 'temperature', type: 'number', required: false, default: 0.7, description: 'Temperature (0-2)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/live/set-llm' };
      },
    }),

    defineAction({
      id: 'flush-queue',
      name: 'Flush Queue',
      description: 'Clear all pending LLM requests (dangerous!)',
      dangerous: true,
      requiresConfirmation: true,
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Clear LLM request queues' };
      },
    }),

    defineAction({
      id: 'reset-cooldowns',
      name: 'Reset Session Cooldowns',
      description: 'Reset rate limit cooldowns for a session',
      params: [
        { name: 'session', type: 'session-id', required: true, description: 'Session to reset' },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Reset cooldowns for session' };
      },
    }),
  ],
});

capabilityRegistry.register(llmCapability);
