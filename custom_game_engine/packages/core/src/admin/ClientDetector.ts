/**
 * Client Detector - Determines client type from request headers
 *
 * Routes requests to appropriate renderer based on User-Agent and Accept headers.
 */

import type { IncomingMessage } from 'http';

export type ClientType = 'browser' | 'llm' | 'api';
export type OutputFormat = 'html' | 'text' | 'json';

export interface ClientInfo {
  type: ClientType;
  format: OutputFormat;
  name: string;  // Detected client name (e.g., 'Chrome', 'Claude', 'curl')
}

/**
 * Detect client type and preferred output format from HTTP request
 */
export function detectClient(req: IncomingMessage): ClientInfo {
  const ua = req.headers['user-agent'] || '';
  const accept = req.headers['accept'] || '';

  // Check for explicit format override via query param
  const url = new URL(req.url || '/', `http://localhost`);
  const formatParam = url.searchParams.get('format');

  if (formatParam === 'html') {
    return { type: 'browser', format: 'html', name: 'explicit-html' };
  }
  if (formatParam === 'text') {
    return { type: 'api', format: 'text', name: 'explicit-text' };
  }
  if (formatParam === 'json') {
    return { type: 'api', format: 'json', name: 'explicit-json' };
  }

  // LLM clients (Claude Code, OpenAI, Anthropic SDK)
  if (ua.includes('Claude') || ua.includes('claude')) {
    return { type: 'llm', format: 'text', name: 'Claude' };
  }
  if (ua.includes('OpenAI') || ua.includes('openai')) {
    return { type: 'llm', format: 'text', name: 'OpenAI' };
  }
  if (ua.includes('Anthropic') || ua.includes('anthropic')) {
    return { type: 'llm', format: 'text', name: 'Anthropic' };
  }
  if (ua.includes('GPT') || ua.includes('gpt')) {
    return { type: 'llm', format: 'text', name: 'GPT' };
  }

  // CLI tools
  if (ua.includes('curl')) {
    return { type: 'api', format: 'text', name: 'curl' };
  }
  if (ua.includes('wget')) {
    return { type: 'api', format: 'text', name: 'wget' };
  }
  if (ua.includes('httpie') || ua.includes('HTTPie')) {
    return { type: 'api', format: 'text', name: 'httpie' };
  }
  if (ua.includes('Postman')) {
    return { type: 'api', format: 'json', name: 'Postman' };
  }
  if (ua.includes('Insomnia')) {
    return { type: 'api', format: 'json', name: 'Insomnia' };
  }

  // Node.js fetch/axios (typically programmatic access)
  if (ua.includes('node-fetch') || ua.includes('axios') || ua.includes('got')) {
    return { type: 'api', format: 'json', name: 'node-http' };
  }

  // Python requests
  if (ua.includes('python-requests') || ua.includes('Python')) {
    return { type: 'api', format: 'json', name: 'python' };
  }

  // Browsers want HTML
  const isBrowser = accept.includes('text/html') && (
    ua.includes('Chrome') ||
    ua.includes('Firefox') ||
    ua.includes('Safari') ||
    ua.includes('Edge') ||
    ua.includes('Mozilla')
  );

  if (isBrowser) {
    // Identify specific browser
    let browserName = 'Browser';
    if (ua.includes('Chrome') && !ua.includes('Edge')) {
      browserName = 'Chrome';
    } else if (ua.includes('Firefox')) {
      browserName = 'Firefox';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browserName = 'Safari';
    } else if (ua.includes('Edge')) {
      browserName = 'Edge';
    }

    return { type: 'browser', format: 'html', name: browserName };
  }

  // API clients that prefer JSON
  if (accept.includes('application/json')) {
    return { type: 'api', format: 'json', name: 'json-client' };
  }

  // Default: API client with text format
  return { type: 'api', format: 'text', name: 'unknown' };
}

/**
 * Get content type header for output format
 */
export function getContentType(format: OutputFormat): string {
  switch (format) {
    case 'html':
      return 'text/html; charset=utf-8';
    case 'json':
      return 'application/json; charset=utf-8';
    case 'text':
    default:
      return 'text/plain; charset=utf-8';
  }
}
