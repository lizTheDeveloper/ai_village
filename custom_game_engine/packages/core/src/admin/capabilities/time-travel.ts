/**
 * Time Travel Capability - Universe forking and timeline navigation
 *
 * PROGRESSION-GATED: These abilities unlock after the player gains
 * control over time manipulation in-game. The angel should check
 * if time travel is unlocked before offering these options.
 *
 * Provides admin interface for:
 * - Creating timeline branches (universe forks)
 * - Navigating between timelines
 * - Viewing timeline history and divergence points
 * - Merging or pruning timelines
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Option Definitions
// ============================================================================

const FORK_REASON_OPTIONS = [
  { value: 'experiment', label: 'Experiment (what if?)' },
  { value: 'mistake', label: 'Undo a Mistake' },
  { value: 'preserve', label: 'Preserve This Moment' },
  { value: 'diverge', label: 'Explore Different Path' },
];

const TIMELINE_VIEW_OPTIONS = [
  { value: 'tree', label: 'Tree View (branches)' },
  { value: 'linear', label: 'Linear (current only)' },
  { value: 'parallel', label: 'Parallel Comparison' },
];

// ============================================================================
// Time Travel Capability Definition
// ============================================================================

const timeTravelCapability = defineCapability({
  id: 'time-travel',
  name: 'Time & Timelines',
  description: 'Navigate timelines, fork universes, undo the past. REQUIRES: Time manipulation unlocked.',
  category: 'systems',

  tab: {
    icon: '⏳',
    priority: 5,
  },

  queries: [
    defineQuery({
      id: 'check-time-travel-unlocked',
      name: 'Check Time Travel Access',
      description: 'Check if player has unlocked time manipulation abilities',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/player/abilities/time-travel' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          unlocked?: boolean;
          unlockedAt?: number;
          method?: string;
          currentPower?: number;
          maxRewindTicks?: number;
        };

        let output = 'TIME TRAVEL STATUS\n\n';

        if (result.unlocked) {
          output += 'Status: UNLOCKED\n';
          output += `Method: ${result.method ?? 'Unknown'}\n`;
          output += `Power Level: ${result.currentPower ?? 0}%\n`;
          output += `Max Rewind: ${result.maxRewindTicks ?? 0} ticks\n`;
        } else {
          output += 'Status: LOCKED\n';
          output += 'Time manipulation has not yet been discovered.\n';
          output += 'Continue your journey to unlock this power.';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-timeline-tree',
      name: 'View Timeline Tree',
      description: 'See all timeline branches and their relationships',
      params: [
        {
          name: 'view', type: 'select', required: false,
          options: TIMELINE_VIEW_OPTIONS,
          default: 'tree',
          description: 'How to visualize timelines',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/timelines' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          currentTimeline?: string;
          totalBranches?: number;
          timelines?: Array<{
            id: string;
            name?: string;
            parentId?: string;
            forkTick: number;
            forkReason?: string;
            currentTick: number;
            isActive: boolean;
          }>;
        };

        let output = 'TIMELINE TREE\n';
        output += `${'='.repeat(40)}\n\n`;

        output += `Current Timeline: ${result.currentTimeline ?? 'Prime'}\n`;
        output += `Total Branches: ${result.totalBranches ?? 1}\n\n`;

        if (result.timelines?.length) {
          result.timelines.forEach(t => {
            const marker = t.isActive ? '▶' : '○';
            const parent = t.parentId ? ` (from ${t.parentId})` : ' (origin)';
            output += `${marker} ${t.name ?? t.id}${parent}\n`;
            output += `    Forked at tick ${t.forkTick}`;
            if (t.forkReason) {
              output += ` (${t.forkReason})`;
            }
            output += `\n    Current: tick ${t.currentTick}\n\n`;
          });
        } else {
          output += 'Only the prime timeline exists.\n';
          output += 'Fork a timeline to explore alternate possibilities.';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-divergence-points',
      name: 'Find Divergence Points',
      description: 'Find significant moments where timelines could branch',
      params: [
        { name: 'lookbackTicks', type: 'number', required: false, default: 1000, description: 'How far back to look' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/timelines/divergence-points' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          points?: Array<{
            tick: number;
            description: string;
            significance: string;
            involvedEntities: string[];
            reversible: boolean;
          }>;
        };

        let output = 'SIGNIFICANT MOMENTS\n';
        output += '(Potential divergence points)\n\n';

        if (result.points?.length) {
          result.points.forEach(p => {
            output += `[Tick ${p.tick}] ${p.description}\n`;
            output += `  Significance: ${p.significance}\n`;
            output += `  Involved: ${p.involvedEntities.join(', ')}\n`;
            output += `  Reversible: ${p.reversible ? 'Yes' : 'No'}\n\n`;
          });
        } else {
          output += 'No significant divergence points found in this period.';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'compare-timelines',
      name: 'Compare Timelines',
      description: 'Compare two timelines to see what differs',
      params: [
        { name: 'timeline1', type: 'string', required: true, description: 'First timeline ID' },
        { name: 'timeline2', type: 'string', required: true, description: 'Second timeline ID' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/timelines/compare' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          timeline1?: { id: string; tick: number };
          timeline2?: { id: string; tick: number };
          divergedAtTick?: number;
          differences?: Array<{
            category: string;
            description: string;
            timeline1Value: string;
            timeline2Value: string;
          }>;
        };

        let output = 'TIMELINE COMPARISON\n\n';

        output += `Timeline A: ${result.timeline1?.id ?? '?'} (tick ${result.timeline1?.tick ?? 0})\n`;
        output += `Timeline B: ${result.timeline2?.id ?? '?'} (tick ${result.timeline2?.tick ?? 0})\n`;
        output += `Diverged at: tick ${result.divergedAtTick ?? 0}\n\n`;

        if (result.differences?.length) {
          output += 'DIFFERENCES:\n';
          result.differences.forEach(d => {
            output += `\n[${d.category}] ${d.description}\n`;
            output += `  A: ${d.timeline1Value}\n`;
            output += `  B: ${d.timeline2Value}\n`;
          });
        } else {
          output += 'Timelines are identical (or too similar to compare).';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-rewind-preview',
      name: 'Preview Rewind',
      description: 'See what would change if you rewound to a specific moment',
      params: [
        { name: 'targetTick', type: 'number', required: true, description: 'Tick to rewind to' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/timelines/rewind-preview' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          currentTick?: number;
          targetTick?: number;
          ticksRewound?: number;
          willBeLost?: Array<{
            type: string;
            description: string;
            count: number;
          }>;
          warnings?: string[];
        };

        let output = 'REWIND PREVIEW\n\n';

        output += `Current: tick ${result.currentTick ?? 0}\n`;
        output += `Target: tick ${result.targetTick ?? 0}\n`;
        output += `Rewinding: ${result.ticksRewound ?? 0} ticks\n\n`;

        if (result.willBeLost?.length) {
          output += 'WILL BE UNDONE:\n';
          result.willBeLost.forEach(item => {
            output += `  - ${item.count}x ${item.type}: ${item.description}\n`;
          });
          output += '\n';
        }

        if (result.warnings?.length) {
          output += 'WARNINGS:\n';
          result.warnings.forEach(w => {
            output += `  ⚠ ${w}\n`;
          });
        }

        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'fork-timeline',
      name: 'Fork Timeline',
      description: 'Create a new timeline branch from the current moment',
      dangerous: true,
      params: [
        { name: 'name', type: 'string', required: false, description: 'Name for the new timeline' },
        {
          name: 'reason', type: 'select', required: false,
          options: FORK_REASON_OPTIONS,
          default: 'experiment',
          description: 'Why are you forking?',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Created timeline branch: ${params.name ?? 'Unnamed'}` };
      },
    }),

    defineAction({
      id: 'fork-from-past',
      name: 'Fork From Past',
      description: 'Create a new timeline starting from a past moment',
      dangerous: true,
      params: [
        { name: 'forkTick', type: 'number', required: true, description: 'Tick to fork from' },
        { name: 'name', type: 'string', required: false, description: 'Name for the new timeline' },
        {
          name: 'reason', type: 'select', required: false,
          options: FORK_REASON_OPTIONS,
          default: 'experiment',
          description: 'Why are you forking?',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Forked timeline from tick ${params.forkTick}` };
      },
    }),

    defineAction({
      id: 'switch-timeline',
      name: 'Switch Timeline',
      description: 'Switch to a different timeline branch',
      dangerous: true,
      params: [
        { name: 'timelineId', type: 'string', required: true, description: 'Timeline to switch to' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Switched to timeline: ${params.timelineId}` };
      },
    }),

    defineAction({
      id: 'rewind-time',
      name: 'Rewind Time',
      description: 'Rewind the current timeline to an earlier state',
      dangerous: true,
      params: [
        { name: 'targetTick', type: 'number', required: true, description: 'Tick to rewind to' },
        { name: 'preserveBranch', type: 'boolean', required: false, default: true, description: 'Keep current state as a branch?' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Rewound to tick ${params.targetTick}` };
      },
    }),

    defineAction({
      id: 'name-timeline',
      name: 'Name Timeline',
      description: 'Give a timeline a memorable name',
      params: [
        { name: 'timelineId', type: 'string', required: true, description: 'Timeline to name' },
        { name: 'name', type: 'string', required: true, description: 'New name' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Named timeline: ${params.name}` };
      },
    }),

    defineAction({
      id: 'prune-timeline',
      name: 'Prune Timeline',
      description: 'Delete an abandoned timeline branch (cannot delete active timeline)',
      dangerous: true,
      params: [
        { name: 'timelineId', type: 'string', required: true, description: 'Timeline to delete' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Pruned timeline: ${params.timelineId}` };
      },
    }),

    defineAction({
      id: 'bookmark-moment',
      name: 'Bookmark Moment',
      description: 'Mark the current moment as significant for easy return',
      params: [
        { name: 'name', type: 'string', required: true, description: 'Bookmark name' },
        { name: 'description', type: 'string', required: false, description: 'Why is this moment important?' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return { success: true, message: `Bookmarked: ${params.name}` };
      },
    }),
  ],
});

capabilityRegistry.register(timeTravelCapability);
