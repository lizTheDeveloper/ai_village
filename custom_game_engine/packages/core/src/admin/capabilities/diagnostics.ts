/**
 * Diagnostics Capability - Monitor invalid property/method access
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';
import { diagnosticsHarness } from '../../diagnostics/DiagnosticsHarness.js';

const diagnosticsCapability = defineCapability({
  id: 'diagnostics',
  name: 'Diagnostics',
  description: 'Monitor and detect invalid property/method access throughout the codebase',
  category: 'infrastructure',

  tab: {
    icon: '🔍',
    priority: 70,
  },

  queries: [
    defineQuery({
      id: 'summary',
      name: 'Issue Summary',
      description: 'Get overview of all detected issues',
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        const summary = diagnosticsHarness.getSummary();
        return {
          enabled: diagnosticsHarness.isEnabled(),
          ...summary,
        };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          enabled: boolean;
          totalIssues: number;
          byType: Record<string, number>;
          bySeverity: Record<string, number>;
          topIssues: any[];
        };

        if (!result.enabled) {
          return `⚠️  DIAGNOSTICS DISABLED\n\nEnable with: window.game.diagnostics.setEnabled(true)\nOr set DIAGNOSTICS_MODE=true in .env`;
        }

        let output = `DIAGNOSTICS SUMMARY\n\n`;
        output += `Total Unique Issues: ${result.totalIssues}\n\n`;

        output += `BY TYPE:\n`;
        for (const [type, count] of Object.entries(result.byType)) {
          output += `  ${type}: ${count} occurrences\n`;
        }

        output += `\nBY SEVERITY:\n`;
        for (const [severity, count] of Object.entries(result.bySeverity)) {
          const icon = severity === 'error' ? '🔴' : severity === 'warning' ? '🟡' : '🔵';
          output += `  ${icon} ${severity}: ${count} occurrences\n`;
        }

        output += `\nTOP ISSUES (by frequency):\n`;
        for (const issue of result.topIssues.slice(0, 10)) {
          const icon = issue.severity === 'error' ? '🔴' : '🟡';
          output += `\n${icon} [${issue.type}] ${issue.objectType}.${issue.property}\n`;
          output += `   Count: ${issue.count} | Tick: ${issue.tick}\n`;
          if (issue.context?.suggestions?.length > 0) {
            output += `   Did you mean: ${issue.context.suggestions.join(', ')}?\n`;
          }
        }

        return output;
      },
    }),

    defineQuery({
      id: 'list',
      name: 'List All Issues',
      description: 'Get detailed list of all issues, optionally filtered',
      params: [
        {
          name: 'type',
          type: 'select',
          required: false,
          options: [
            { value: 'all', label: 'All Types' },
            { value: 'undefined_property', label: 'Undefined Property' },
            { value: 'undefined_method', label: 'Undefined Method' },
            { value: 'type_mismatch', label: 'Type Mismatch' },
            { value: 'invalid_component', label: 'Invalid Component' },
          ],
          description: 'Filter by issue type',
        },
        {
          name: 'severity',
          type: 'select',
          required: false,
          options: [
            { value: 'all', label: 'All Severities' },
            { value: 'error', label: 'Errors Only' },
            { value: 'warning', label: 'Warnings Only' },
          ],
          description: 'Filter by severity',
        },
        {
          name: 'minCount',
          type: 'number',
          required: false,
          default: 1,
          description: 'Minimum occurrence count',
        },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        const filter: any = {};
        if (params.type && params.type !== 'all') filter.type = params.type;
        if (params.severity && params.severity !== 'all') filter.severity = params.severity;
        if (params.minCount) filter.minCount = params.minCount;

        const issues = diagnosticsHarness.getIssues(filter);
        return { issues };
      },
      renderResult: (data: unknown) => {
        const result = data as { issues: any[] };
        let output = `DETAILED ISSUES (${result.issues.length} total)\n\n`;

        for (const issue of result.issues) {
          const icon = issue.severity === 'error' ? '🔴' : '🟡';
          output += `${icon} [${issue.type}] ${issue.objectType}.${issue.property}\n`;
          output += `   ID: ${issue.id}\n`;
          output += `   Count: ${issue.count} | Last Tick: ${issue.tick}\n`;

          if (issue.objectId) {
            output += `   Object ID: ${issue.objectId}\n`;
          }

          if (issue.context?.suggestions?.length > 0) {
            output += `   Suggestions: ${issue.context.suggestions.join(', ')}\n`;
          }

          if (issue.context?.availableFields) {
            output += `   Available fields: ${issue.context.availableFields.slice(0, 5).join(', ')}\n`;
          }

          output += `   Stack (first 3 lines):\n`;
          const stackLines = issue.stackTrace.split('\n').slice(0, 3);
          for (const line of stackLines) {
            output += `     ${line.trim()}\n`;
          }

          output += `\n`;
        }

        return output;
      },
    }),

    defineQuery({
      id: 'export',
      name: 'Export JSON',
      description: 'Export all diagnostics data as JSON for external analysis',
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        const json = diagnosticsHarness.export();
        return { json };
      },
      renderResult: (data: unknown) => {
        const result = data as { json: string };
        return `DIAGNOSTICS EXPORT\n\n${result.json}\n\nCopy this JSON for external analysis.`;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'enable',
      name: 'Enable Diagnostics',
      description: 'Turn on diagnostics harness to start tracking issues',
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        diagnosticsHarness.setEnabled(true);
        return { success: true, message: 'Diagnostics enabled - issues will now be tracked' };
      },
    }),

    defineAction({
      id: 'disable',
      name: 'Disable Diagnostics',
      description: 'Turn off diagnostics harness (stops tracking, keeps existing data)',
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        diagnosticsHarness.setEnabled(false);
        return { success: true, message: 'Diagnostics disabled - issue tracking paused' };
      },
    }),

    defineAction({
      id: 'clear',
      name: 'Clear All Issues',
      description: 'Delete all tracked issues (fresh start)',
      requiresConfirmation: true,
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        diagnosticsHarness.clear();
        return { success: true, message: 'All diagnostics data cleared' };
      },
    }),

    defineAction({
      id: 'suppress-pattern',
      name: 'Suppress Pattern',
      description: 'Stop reporting issues matching a specific pattern (e.g., known safe code)',
      params: [
        {
          name: 'pattern',
          type: 'string',
          required: true,
          description: 'Pattern to suppress (substring match on issue ID)',
        },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        diagnosticsHarness.suppressPattern(params.pattern as string);
        return {
          success: true,
          message: `Suppressed pattern: ${params.pattern}`,
        };
      },
    }),
  ],
});

capabilityRegistry.register(diagnosticsCapability);
