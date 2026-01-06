/**
 * Text Renderer - Generates plain text output for LLMs and CLI tools
 *
 * Produces consistent, readable text that's optimized for LLM consumption:
 * - Clear section headers
 * - curl examples for actions
 * - Structured data display
 */

import {
  capabilityRegistry,
  type AdminCapability,
  type AdminAction,
  type AdminQuery,
  type AdminParam,
  type ViewContext,
} from './CapabilityRegistry.js';

const LINE_WIDTH = 80;
const SEPARATOR = '='.repeat(LINE_WIDTH);
const SUBSEPARATOR = '-'.repeat(LINE_WIDTH);

/**
 * Render the main admin dashboard as text
 */
export function renderDashboardText(context: ViewContext): string {
  const { baseUrl, sessionId } = context;
  const gameConnected = context.gameClient !== null;
  const tabs = capabilityRegistry.getTabs();

  let output = `${SEPARATOR}
ADMIN CONSOLE - Multiverse: The End of Eternity
${SEPARATOR}

Game Status: ${gameConnected ? '🟢 CONNECTED' : '🔴 NOT CONNECTED'}${sessionId ? ` (session: ${sessionId})` : ''}

${SEPARATOR}
AVAILABLE TABS
${SEPARATOR}

`;

  // List all tabs
  tabs.forEach((cap, idx) => {
    const num = String(idx + 1).padStart(2, ' ');
    output += `${num}. ${cap.tab?.icon || '📄'} ${cap.id.padEnd(16)} - ${cap.description}\n`;
  });

  output += `
View a tab: GET ${baseUrl}/admin/{tab-id}
            curl "${baseUrl}/admin/agents"

${SEPARATOR}
QUICK REFERENCE
${SEPARATOR}

`;

  // Show quick reference for common actions
  const quickActions = [
    { path: '/admin/queries/list-sessions', desc: 'List all game sessions' },
    { path: '/admin/queries/list-agents', desc: 'List all agents' },
    { path: '/admin/actions/pause', desc: 'Pause/resume game' },
    { path: '/admin/actions/spawn-agent', desc: 'Spawn new agent' },
  ];

  quickActions.forEach(({ path, desc }) => {
    output += `${desc}:\n  curl "${baseUrl}${path}"\n\n`;
  });

  output += `${SEPARATOR}
REGISTRY (for tooling)
${SEPARATOR}

Get full registry schema:
  curl "${baseUrl}/admin/registry"

Get capability schema:
  curl "${baseUrl}/admin/registry/{capability-id}"

${SEPARATOR}
`;

  return output;
}

/**
 * Render a specific capability as text
 */
export function renderCapabilityText(capability: AdminCapability, context: ViewContext): string {
  const { baseUrl } = context;
  const gameConnected = context.gameClient !== null;

  let output = `${SEPARATOR}
${capability.tab?.icon || '📄'} ${capability.name.toUpperCase()}
${SEPARATOR}

${capability.description}

Game Status: ${gameConnected ? '🟢 CONNECTED' : '🔴 NOT CONNECTED'}

`;

  // Render queries
  if (capability.queries && capability.queries.length > 0) {
    output += `${SUBSEPARATOR}
QUERIES (read-only)
${SUBSEPARATOR}

`;
    for (const query of capability.queries) {
      output += renderQueryText(query, capability.id, baseUrl);
    }
  }

  // Render actions
  if (capability.actions && capability.actions.length > 0) {
    output += `${SUBSEPARATOR}
ACTIONS (modify game state)
${SUBSEPARATOR}

`;
    for (const action of capability.actions) {
      output += renderActionText(action, capability.id, baseUrl);
    }
  }

  // Render links
  if (capability.links && capability.links.length > 0) {
    output += `${SUBSEPARATOR}
LINKS
${SUBSEPARATOR}

`;
    for (const link of capability.links) {
      const url = link.url.replace('{session}', context.sessionId || 'latest');
      output += `• ${link.name}\n`;
      output += `  ${link.description}\n`;
      output += `  URL: ${url}\n`;
      if (link.embeddable) {
        output += `  (embeddable in game UI)\n`;
      }
      output += `\n`;
    }
  }

  output += SEPARATOR + '\n';
  return output;
}

/**
 * Render a query as text with curl example
 */
function renderQueryText(query: AdminQuery, capabilityId: string, baseUrl: string): string {
  let output = `• ${query.id}\n`;
  output += `  ${query.description}\n`;

  // Build curl example
  const queryParams = query.params
    .filter(p => p.required)
    .map(p => `${p.name}=<${p.name}>`)
    .join('&');

  const url = queryParams
    ? `${baseUrl}/admin/queries/${query.id}?${queryParams}`
    : `${baseUrl}/admin/queries/${query.id}`;

  output += `  curl "${url}"\n`;

  // List parameters
  if (query.params.length > 0) {
    output += `\n  Parameters:\n`;
    for (const param of query.params) {
      const req = param.required ? 'required' : 'optional';
      const def = param.default !== undefined ? `, default: ${JSON.stringify(param.default)}` : '';
      output += `    - ${param.name} (${param.type}, ${req}${def}): ${param.description}\n`;
    }
  }

  output += `\n`;
  return output;
}

/**
 * Render an action as text with curl example
 */
function renderActionText(action: AdminAction, capabilityId: string, baseUrl: string): string {
  let output = `• ${action.id}`;
  if (action.dangerous) {
    output += ` ⚠️ DANGEROUS`;
  }
  output += `\n`;
  output += `  ${action.description}\n`;

  // Build curl example with JSON body
  const exampleBody: Record<string, unknown> = {};
  for (const param of action.params) {
    if (param.required) {
      exampleBody[param.name] = getExampleValue(param);
    } else if (param.default !== undefined) {
      exampleBody[param.name] = param.default;
    }
  }

  output += `  curl -X POST ${baseUrl}/admin/actions/${action.id} \\\n`;
  output += `    -H "Content-Type: application/json" \\\n`;
  output += `    -d '${JSON.stringify(exampleBody)}'\n`;

  // List parameters
  if (action.params.length > 0) {
    output += `\n  Parameters:\n`;
    for (const param of action.params) {
      const req = param.required ? 'required' : 'optional';
      const def = param.default !== undefined ? `, default: ${JSON.stringify(param.default)}` : '';
      output += `    - ${param.name} (${param.type}, ${req}${def}): ${param.description}\n`;
    }
  }

  if (action.requiresConfirmation) {
    output += `\n  NOTE: This action requires confirmation.\n`;
  }

  output += `\n`;
  return output;
}

/**
 * Get an example value for a parameter type
 */
function getExampleValue(param: AdminParam): unknown {
  switch (param.type) {
    case 'string':
      return `<${param.name}>`;
    case 'number':
      return 0;
    case 'boolean':
      return true;
    case 'select':
      return param.options?.[0]?.value || '<option>';
    case 'entity-id':
      return `<${param.entityType || 'entity'}_id>`;
    case 'session-id':
      return '<session_id>';
    case 'json':
      return {};
    default:
      return `<${param.name}>`;
  }
}

/**
 * Render query result as text
 */
export function renderQueryResultText(
  data: unknown,
  query: AdminQuery,
  context: ViewContext
): string {
  // Use custom renderer if provided
  if (query.renderResult) {
    return query.renderResult(data);
  }

  // Default: pretty print JSON
  if (typeof data === 'object') {
    return JSON.stringify(data, null, 2);
  }

  return String(data);
}

/**
 * Render action result as text
 */
export function renderActionResultText(
  result: { success: boolean; message?: string; data?: unknown; error?: string },
  action: AdminAction,
  context: ViewContext
): string {
  let output = '';

  if (result.success) {
    output += `✓ SUCCESS: ${result.message || action.name + ' completed'}\n`;
  } else {
    output += `✗ FAILED: ${result.error || 'Unknown error'}\n`;
  }

  if (result.data) {
    output += `\nData:\n${JSON.stringify(result.data, null, 2)}\n`;
  }

  return output;
}

/**
 * Render error as text
 */
export function renderErrorText(error: string, statusCode: number = 500): string {
  return `${SEPARATOR}
ERROR (${statusCode})
${SEPARATOR}

${error}

${SEPARATOR}
`;
}

/**
 * Render registry as text (for LLM introspection)
 */
export function renderRegistryText(context: ViewContext): string {
  const { baseUrl } = context;
  const registry = capabilityRegistry.toJSON() as {
    capabilities: Record<string, unknown>;
    categories: string[];
    tabs: Array<{ id: string; name: string; icon?: string }>;
  };

  let output = `${SEPARATOR}
CAPABILITY REGISTRY
${SEPARATOR}

This registry describes all available admin capabilities.
Use this to understand what actions and queries are available.

${SUBSEPARATOR}
TABS
${SUBSEPARATOR}

`;

  for (const tab of registry.tabs) {
    output += `${tab.icon || '📄'} ${tab.id} - ${tab.name}\n`;
  }

  output += `
${SUBSEPARATOR}
CATEGORIES
${SUBSEPARATOR}

`;

  for (const category of registry.categories) {
    output += `• ${category}\n`;
  }

  output += `
${SUBSEPARATOR}
CAPABILITIES
${SUBSEPARATOR}

`;

  for (const [id, cap] of Object.entries(registry.capabilities)) {
    const c = cap as { name: string; description: string; category: string; actions?: unknown[]; queries?: unknown[] };
    output += `${id}:\n`;
    output += `  Name: ${c.name}\n`;
    output += `  Category: ${c.category}\n`;
    output += `  Description: ${c.description}\n`;
    output += `  Actions: ${c.actions?.length || 0}\n`;
    output += `  Queries: ${c.queries?.length || 0}\n`;
    output += `  Details: curl "${baseUrl}/admin/${id}"\n`;
    output += `\n`;
  }

  output += SEPARATOR + '\n';
  return output;
}
