/**
 * Background Realms Capability - Check on other running universes
 *
 * Multiple universes can run simultaneously in the background.
 * The player sees only their active universe, but others continue
 * to exist and evolve. The angel can peek into these shadow realms.
 *
 * This creates interesting gameplay:
 * - "What's happening in the universe where I made a different choice?"
 * - "Is my old timeline still running?"
 * - "Can I check on the alternate version of my favorite agent?"
 *
 * Provides admin interface for:
 * - Listing all running background universes
 * - Peeking into background universe state
 * - Comparing entities across universes
 * - Getting summarized reports of background activity
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Option Definitions
// ============================================================================

const REALM_SORT_OPTIONS = [
  { value: 'created', label: 'Creation Time' },
  { value: 'activity', label: 'Activity Level' },
  { value: 'divergence', label: 'Divergence from Prime' },
  { value: 'population', label: 'Population' },
];

const REPORT_TYPE_OPTIONS = [
  { value: 'summary', label: 'Brief Summary' },
  { value: 'population', label: 'Population Report' },
  { value: 'events', label: 'Recent Events' },
  { value: 'comparison', label: 'Compare to Current' },
];

// ============================================================================
// Background Realms Capability Definition
// ============================================================================

const backgroundRealmsCapability = defineCapability({
  id: 'background-realms',
  name: 'Background Realms',
  description: 'Peek into other running universes. See what might have been.',
  category: 'universes',

  tab: {
    icon: '🌌',
    priority: 4,
  },

  queries: [
    defineQuery({
      id: 'list-background-universes',
      name: 'List Running Universes',
      description: 'See all universes running in the background',
      params: [
        {
          name: 'sortBy', type: 'select', required: false,
          options: REALM_SORT_OPTIONS,
          default: 'activity',
          description: 'How to sort',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/universes/background' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          activeUniverse?: string;
          backgroundCount?: number;
          universes?: Array<{
            id: string;
            name?: string;
            createdTick: number;
            currentTick: number;
            population: number;
            divergenceScore: number;
            lastActivity?: string;
            isPaused: boolean;
          }>;
        };

        let output = 'BACKGROUND UNIVERSES\n';
        output += `${'='.repeat(40)}\n\n`;

        output += `Active Universe: ${result.activeUniverse ?? 'Prime'}\n`;
        output += `Background Universes: ${result.backgroundCount ?? 0}\n\n`;

        if (result.universes?.length) {
          result.universes.forEach(u => {
            const status = u.isPaused ? '[PAUSED]' : '[RUNNING]';
            output += `${u.name ?? u.id} ${status}\n`;
            output += `  Created: tick ${u.createdTick}\n`;
            output += `  Current: tick ${u.currentTick}\n`;
            output += `  Population: ${u.population}\n`;
            output += `  Divergence: ${u.divergenceScore}%\n`;
            if (u.lastActivity) {
              output += `  Recent: ${u.lastActivity}\n`;
            }
            output += '\n';
          });
        } else {
          output += 'No background universes running.\n';
          output += 'Fork a timeline to create one.';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'peek-into-realm',
      name: 'Peek Into Realm',
      description: 'Get a detailed view of a background universe',
      params: [
        { name: 'universeId', type: 'string', required: true, description: 'Universe to peek into' },
        {
          name: 'reportType', type: 'select', required: false,
          options: REPORT_TYPE_OPTIONS,
          default: 'summary',
          description: 'Type of report',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/universes/peek' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          universeName?: string;
          currentTick?: number;
          summary?: string;
          stats?: {
            population: number;
            births: number;
            deaths: number;
            buildings: number;
            activePlots: number;
          };
          recentEvents?: string[];
          notableEntities?: Array<{
            name: string;
            status: string;
          }>;
        };

        let output = `REALM PEEK: ${result.universeName ?? 'Unknown'}\n`;
        output += `Tick: ${result.currentTick ?? 0}\n\n`;

        if (result.summary) {
          output += `${result.summary}\n\n`;
        }

        if (result.stats) {
          output += 'STATISTICS:\n';
          output += `  Population: ${result.stats.population}\n`;
          output += `  Births/Deaths: ${result.stats.births}/${result.stats.deaths}\n`;
          output += `  Buildings: ${result.stats.buildings}\n`;
          output += `  Active Plots: ${result.stats.activePlots}\n\n`;
        }

        if (result.recentEvents?.length) {
          output += 'RECENT EVENTS:\n';
          result.recentEvents.slice(0, 5).forEach(e => {
            output += `  • ${e}\n`;
          });
          output += '\n';
        }

        if (result.notableEntities?.length) {
          output += 'NOTABLE ENTITIES:\n';
          result.notableEntities.forEach(e => {
            output += `  ${e.name}: ${e.status}\n`;
          });
        }

        return output;
      },
    }),

    defineQuery({
      id: 'find-entity-across-realms',
      name: 'Find Entity Across Realms',
      description: 'Find alternate versions of an entity in other universes',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, description: 'Entity to find' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/universes/find-entity' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          entityName?: string;
          currentVersion?: {
            universe: string;
            status: string;
            summary: string;
          };
          alternateVersions?: Array<{
            universe: string;
            universeName?: string;
            exists: boolean;
            status?: string;
            divergence?: string;
          }>;
        };

        let output = `ENTITY ACROSS REALMS: ${result.entityName ?? 'Unknown'}\n\n`;

        if (result.currentVersion) {
          output += 'CURRENT UNIVERSE:\n';
          output += `  ${result.currentVersion.summary}\n\n`;
        }

        if (result.alternateVersions?.length) {
          output += 'ALTERNATE VERSIONS:\n';
          result.alternateVersions.forEach(v => {
            const name = v.universeName ?? v.universe;
            if (v.exists) {
              output += `\n  [${name}]\n`;
              output += `    Status: ${v.status ?? 'Unknown'}\n`;
              if (v.divergence) {
                output += `    Divergence: ${v.divergence}\n`;
              }
            } else {
              output += `\n  [${name}] - Does not exist in this timeline\n`;
            }
          });
        } else {
          output += 'No alternate versions found.';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'compare-universes',
      name: 'Compare Universes',
      description: 'Compare two universes to see major differences',
      params: [
        { name: 'universe1', type: 'string', required: true, description: 'First universe (or "current")' },
        { name: 'universe2', type: 'string', required: true, description: 'Second universe' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/universes/compare' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          universe1?: { id: string; name: string; tick: number };
          universe2?: { id: string; name: string; tick: number };
          sharedAncestor?: number;
          majorDifferences?: Array<{
            category: string;
            universe1Value: string;
            universe2Value: string;
            significance: string;
          }>;
          whoSurvived?: {
            onlyIn1: string[];
            onlyIn2: string[];
            inBoth: number;
          };
        };

        let output = 'UNIVERSE COMPARISON\n\n';

        const name1 = result.universe1?.name ?? 'Universe 1';
        const name2 = result.universe2?.name ?? 'Universe 2';

        output += `${name1} (tick ${result.universe1?.tick ?? 0})\n`;
        output += `  vs\n`;
        output += `${name2} (tick ${result.universe2?.tick ?? 0})\n\n`;

        if (result.sharedAncestor) {
          output += `Diverged from common ancestor at tick ${result.sharedAncestor}\n\n`;
        }

        if (result.majorDifferences?.length) {
          output += 'MAJOR DIFFERENCES:\n';
          result.majorDifferences.forEach(d => {
            output += `\n[${d.category}] (${d.significance})\n`;
            output += `  ${name1}: ${d.universe1Value}\n`;
            output += `  ${name2}: ${d.universe2Value}\n`;
          });
          output += '\n';
        }

        if (result.whoSurvived) {
          output += 'WHO SURVIVED:\n';
          output += `  In both: ${result.whoSurvived.inBoth}\n`;
          if (result.whoSurvived.onlyIn1.length) {
            output += `  Only in ${name1}: ${result.whoSurvived.onlyIn1.join(', ')}\n`;
          }
          if (result.whoSurvived.onlyIn2.length) {
            output += `  Only in ${name2}: ${result.whoSurvived.onlyIn2.join(', ')}\n`;
          }
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-realm-activity-feed',
      name: 'Get Realm Activity Feed',
      description: 'Stream of recent activity across all background realms',
      params: [
        { name: 'limit', type: 'number', required: false, default: 20, description: 'Max events' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/universes/activity-feed' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          events?: Array<{
            universe: string;
            universeName?: string;
            tick: number;
            event: string;
            significance: string;
          }>;
        };

        let output = 'CROSS-REALM ACTIVITY FEED\n';
        output += `${'='.repeat(40)}\n\n`;

        if (result.events?.length) {
          result.events.forEach(e => {
            const realm = e.universeName ?? e.universe;
            const sig = e.significance === 'high' ? '!' : e.significance === 'medium' ? '•' : '·';
            output += `${sig} [${realm}:${e.tick}] ${e.event}\n`;
          });
        } else {
          output += 'No recent activity in background realms.';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'what-if-scenario',
      name: 'What If Scenario',
      description: 'Ask what would have happened if a past event went differently',
      params: [
        { name: 'eventDescription', type: 'string', required: true, description: 'What event to reconsider' },
        { name: 'alternativeOutcome', type: 'string', required: true, description: 'What if it went this way instead?' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/universes/what-if' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          eventFound?: boolean;
          existingAlternate?: string;
          projection?: {
            confidence: string;
            predictedOutcome: string;
            butterflies: string[];
          };
        };

        let output = 'WHAT-IF ANALYSIS\n\n';

        if (!result.eventFound) {
          output += 'Could not find a matching event in history.';
          return output;
        }

        if (result.existingAlternate) {
          output += `An alternate timeline already exists where this happened!\n`;
          output += `Universe: ${result.existingAlternate}\n\n`;
          output += 'You can peek into this realm to see what actually happened.';
        } else if (result.projection) {
          output += `Confidence: ${result.projection.confidence}\n\n`;
          output += `Likely Outcome:\n${result.projection.predictedOutcome}\n\n`;

          if (result.projection.butterflies?.length) {
            output += 'Butterfly Effects:\n';
            result.projection.butterflies.forEach(b => {
              output += `  → ${b}\n`;
            });
          }
        }

        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'pause-background-realm',
      name: 'Pause Background Realm',
      description: 'Pause simulation of a background universe',
      params: [
        { name: 'universeId', type: 'string', required: true, description: 'Universe to pause' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Paused background realm: ${params.universeId}` };
      },
    }),

    defineAction({
      id: 'resume-background-realm',
      name: 'Resume Background Realm',
      description: 'Resume simulation of a paused background universe',
      params: [
        { name: 'universeId', type: 'string', required: true, description: 'Universe to resume' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Resumed background realm: ${params.universeId}` };
      },
    }),

    defineAction({
      id: 'switch-to-realm',
      name: 'Switch to Realm',
      description: 'Switch the active view to a different universe',
      dangerous: true,
      params: [
        { name: 'universeId', type: 'string', required: true, description: 'Universe to switch to' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Switching to realm: ${params.universeId}` };
      },
    }),

    defineAction({
      id: 'name-realm',
      name: 'Name Realm',
      description: 'Give a background universe a memorable name',
      params: [
        { name: 'universeId', type: 'string', required: true, description: 'Universe to name' },
        { name: 'name', type: 'string', required: true, description: 'New name' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Named realm: ${params.name}` };
      },
    }),

    defineAction({
      id: 'archive-realm',
      name: 'Archive Realm',
      description: 'Archive a background universe (saves state, stops simulation)',
      params: [
        { name: 'universeId', type: 'string', required: true, description: 'Universe to archive' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Archived realm: ${params.universeId}` };
      },
    }),

    defineAction({
      id: 'restore-archived-realm',
      name: 'Restore Archived Realm',
      description: 'Restore an archived universe to running state',
      params: [
        { name: 'archiveId', type: 'string', required: true, description: 'Archive to restore' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Restored realm from archive: ${params.archiveId}` };
      },
    }),

    defineAction({
      id: 'send-message-to-realm',
      name: 'Send Message to Realm',
      description: 'Send a message that will appear in another universe (mysterious!)',
      dangerous: true,
      params: [
        { name: 'universeId', type: 'string', required: true, description: 'Target universe' },
        { name: 'message', type: 'string', required: true, description: 'Message to send' },
        { name: 'recipientId', type: 'entity-id', required: false, entityType: 'agent', description: 'Specific recipient (optional)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return {
          success: true,
          message: `Message sent to ${params.universeId}. They may perceive it as a dream or vision.`
        };
      },
    }),

    defineAction({
      id: 'create-what-if-branch',
      name: 'Create What-If Branch',
      description: 'Create a new universe from a what-if scenario',
      dangerous: true,
      params: [
        { name: 'divergencePoint', type: 'number', required: true, description: 'Tick to branch from' },
        { name: 'alteration', type: 'string', required: true, description: 'What changes in this branch?' },
        { name: 'name', type: 'string', required: false, description: 'Name for the new universe' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return {
          success: true,
          message: `Created what-if branch "${params.name ?? 'Unnamed'}" from tick ${params.divergencePoint}`
        };
      },
    }),
  ],
});

capabilityRegistry.register(backgroundRealmsCapability);
