/**
 * Admin Router - Handles all /admin/* requests
 *
 * Routes requests to appropriate capability handlers and renders
 * responses in the format appropriate for the client type.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { WebSocket } from 'ws';
import { URL } from 'url';

import {
  capabilityRegistry,
  type ViewContext,
  type ActionResult,
} from './CapabilityRegistry.js';

import { detectClient, getContentType, type OutputFormat } from './ClientDetector.js';

import {
  renderDashboardText,
  renderCapabilityText,
  renderQueryResultText,
  renderActionResultText,
  renderErrorText,
  renderRegistryText,
} from './TextRenderer.js';

import {
  renderDashboardHtml,
  renderErrorHtml,
} from './HtmlRenderer.js';

export interface AdminRouterConfig {
  baseUrl: string;
  httpPort: number;
  getGameClient: (sessionId?: string) => WebSocket | null;
}

/**
 * Create the admin router handler
 */
export function createAdminRouter(config: AdminRouterConfig) {
  const { baseUrl, httpPort, getGameClient } = config;

  return async function handleAdminRequest(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL
  ): Promise<boolean> {
    const pathname = url.pathname;

    // Only handle /admin/* routes
    if (!pathname.startsWith('/admin')) {
      return false;
    }

    // Detect client type
    const client = detectClient(req);
    const format = client.format;

    // Get session from query params
    const sessionId = url.searchParams.get('session') || undefined;
    const gameClient = getGameClient(sessionId);

    // Create view context
    const context: ViewContext = {
      sessionId,
      format,
      gameClient,
      baseUrl: `http://localhost:${httpPort}`,
      queryParams: Object.fromEntries(url.searchParams),
    };

    // Set content type
    res.setHeader('Content-Type', getContentType(format));
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
      // Route based on path
      const path = pathname.replace('/admin', '') || '/';

      // GET /admin - Main dashboard
      if (path === '/' || path === '') {
        const output = format === 'html'
          ? renderDashboardHtml(context)
          : renderDashboardText(context);
        res.statusCode = 200;
        res.end(output);
        return true;
      }

      // GET /admin/registry - Full registry for tooling
      if (path === '/registry') {
        if (format === 'json') {
          res.end(JSON.stringify(capabilityRegistry.toJSON(), null, 2));
        } else {
          res.end(renderRegistryText(context));
        }
        return true;
      }

      // GET /admin/registry/{id} - Specific capability schema
      const registryMatch = path.match(/^\/registry\/([^/]+)$/);
      if (registryMatch && registryMatch[1]) {
        const capId = registryMatch[1];
        const capability = capabilityRegistry.get(capId);
        if (!capability) {
          return sendError(res, format, `Capability not found: ${capId}`, 404);
        }
        if (format === 'json') {
          res.end(JSON.stringify({
            id: capability.id,
            name: capability.name,
            description: capability.description,
            category: capability.category,
            actions: capability.actions?.map(a => ({
              id: a.id,
              name: a.name,
              description: a.description,
              params: a.params,
            })),
            queries: capability.queries?.map(q => ({
              id: q.id,
              name: q.name,
              description: q.description,
              params: q.params,
            })),
            links: capability.links,
          }, null, 2));
        } else {
          res.end(renderCapabilityText(capability, context));
        }
        return true;
      }

      // GET /admin/queries/{queryId} - Execute a query
      const queryMatch = path.match(/^\/queries\/([^/]+)$/);
      if (queryMatch && queryMatch[1] && req.method === 'GET') {
        const queryId = queryMatch[1];
        const found = capabilityRegistry.findQuery(queryId);
        if (!found) {
          return sendError(res, format, `Query not found: ${queryId}`, 404);
        }

        const { capability, query } = found;

        // Check if game is required
        if (query.requiresGame !== false && !gameClient) {
          return sendError(res, format, 'No game connected. Start a game first.', 503);
        }

        // Build params from query string
        const params: Record<string, unknown> = {};
        for (const param of query.params) {
          const value = url.searchParams.get(param.name);
          if (value !== null) {
            // Parse based on type
            if (param.type === 'number') {
              params[param.name] = parseFloat(value);
            } else if (param.type === 'boolean') {
              params[param.name] = value === 'true' || value === '1';
            } else if (param.type === 'json') {
              try {
                params[param.name] = JSON.parse(value);
              } catch {
                params[param.name] = value;
              }
            } else {
              params[param.name] = value;
            }
          } else if (param.default !== undefined) {
            params[param.name] = param.default;
          } else if (param.required) {
            return sendError(res, format, `Missing required parameter: ${param.name}`, 400);
          }
        }

        // Execute query
        const result = await query.handler(params, gameClient, context);

        // Render result
        if (format === 'json') {
          res.end(JSON.stringify(result, null, 2));
        } else {
          res.end(renderQueryResultText(result, query, context));
        }
        return true;
      }

      // POST /admin/actions/{actionId} - Execute an action
      const actionMatch = path.match(/^\/actions\/([^/]+)$/);
      if (actionMatch && actionMatch[1] && req.method === 'POST') {
        const actionId = actionMatch[1];
        const found = capabilityRegistry.findAction(actionId);
        if (!found) {
          return sendError(res, format, `Action not found: ${actionId}`, 404);
        }

        const { capability, action } = found;

        // Check if game is required
        if (action.requiresGame !== false && !gameClient) {
          return sendError(res, format, 'No game connected. Start a game first.', 503);
        }

        // Parse request body
        const body = await readBody(req);
        let params: Record<string, unknown>;
        try {
          params = JSON.parse(body || '{}');
        } catch {
          return sendError(res, format, 'Invalid JSON body', 400);
        }

        // Validate required params
        for (const param of action.params) {
          if (param.required && !(param.name in params)) {
            return sendError(res, format, `Missing required parameter: ${param.name}`, 400);
          }
          if (!(param.name in params) && param.default !== undefined) {
            params[param.name] = param.default;
          }
        }

        // Execute action
        const result = await action.handler(params, gameClient, context);

        // Render result
        if (format === 'json') {
          res.statusCode = result.success ? 200 : 400;
          res.end(JSON.stringify(result, null, 2));
        } else {
          res.statusCode = result.success ? 200 : 400;
          res.end(renderActionResultText(result, action, context));
        }
        return true;
      }

      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.statusCode = 204;
        res.end();
        return true;
      }

      // GET /admin/{capabilityId} - Capability detail view
      const capabilityMatch = path.match(/^\/([^/]+)$/);
      if (capabilityMatch && capabilityMatch[1]) {
        const capId = capabilityMatch[1];
        const capability = capabilityRegistry.get(capId);
        if (!capability) {
          return sendError(res, format, `Capability not found: ${capId}`, 404);
        }

        if (format === 'html') {
          // For HTML, redirect to dashboard with hash
          res.statusCode = 302;
          res.setHeader('Location', `/admin#${capId}`);
          res.end();
        } else {
          res.end(renderCapabilityText(capability, context));
        }
        return true;
      }

      // Not found
      return sendError(res, format, `Unknown admin route: ${path}`, 404);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      console.error('[AdminRouter] Error:', error);
      return sendError(res, format, message, 500);
    }
  };
}

/**
 * Send an error response
 */
function sendError(res: ServerResponse, format: OutputFormat, message: string, statusCode: number): boolean {
  res.statusCode = statusCode;

  if (format === 'html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(renderErrorHtml(message, statusCode));
  } else if (format === 'json') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: message, statusCode }));
  } else {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(renderErrorText(message, statusCode));
  }

  return true;
}

/**
 * Read request body as string
 */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}
