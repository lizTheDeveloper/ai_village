/**
 * Vite Plugin: SharedArrayBuffer Support
 *
 * Adds required COOP/COEP headers for SharedArrayBuffer support.
 *
 * SharedArrayBuffer requires a secure cross-origin isolated context:
 * - Cross-Origin-Opener-Policy: same-origin
 * - Cross-Origin-Embedder-Policy: require-corp
 *
 * Without these headers, SharedArrayBuffer is disabled by browsers
 * for security reasons (Spectre mitigation).
 *
 * Usage:
 * ```typescript
 * // vite.config.ts
 * import { sharedArrayBufferPlugin } from './vite-sab-plugin.js';
 *
 * export default defineConfig({
 *   plugins: [
 *     sharedArrayBufferPlugin(),
 *     // ... other plugins
 *   ],
 * });
 * ```
 *
 * Browser Compatibility:
 * - Chrome 92+ (July 2021)
 * - Edge 92+ (July 2021)
 * - Firefox 79+ (July 2020)
 * - Safari 15.2+ (January 2022)
 *
 * All require COOP/COEP headers to be set.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer
 */

import type { Plugin } from 'vite';

export interface SharedArrayBufferPluginOptions {
  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean;

  /**
   * Cross-Origin-Opener-Policy value
   * @default 'same-origin'
   */
  coop?: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none';

  /**
   * Cross-Origin-Embedder-Policy value
   * @default 'require-corp'
   */
  coep?: 'require-corp' | 'credentialless';
}

/**
 * Vite plugin to enable SharedArrayBuffer support.
 *
 * Sets required COOP/COEP headers for cross-origin isolation.
 *
 * @param options - Plugin options
 * @returns Vite plugin
 */
export function sharedArrayBufferPlugin(
  options: SharedArrayBufferPluginOptions = {}
): Plugin {
  const {
    verbose = false,
    coop = 'same-origin',
    coep = 'require-corp',
  } = options;

  return {
    name: 'shared-array-buffer-headers',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Set COOP/COEP headers for all requests
        res.setHeader('Cross-Origin-Opener-Policy', coop);
        res.setHeader('Cross-Origin-Embedder-Policy', coep);

        // Also set CORP header for resources to satisfy COEP
        // This allows same-origin resources to be loaded
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

        if (verbose) {
          console.log(`[SAB Plugin] Set headers for: ${req.url}`);
        }

        next();
      });

      // Log when server starts
      server.httpServer?.once('listening', () => {
        console.info('[SAB Plugin] SharedArrayBuffer headers configured');
        console.info('  Cross-Origin-Opener-Policy:', coop);
        console.info('  Cross-Origin-Embedder-Policy:', coep);
        console.info('  Cross-Origin-Resource-Policy: same-origin');
      });
    },

    configurePreviewServer(server) {
      // Also configure for preview server (production preview)
      server.middlewares.use((req, res, next) => {
        res.setHeader('Cross-Origin-Opener-Policy', coop);
        res.setHeader('Cross-Origin-Embedder-Policy', coep);
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        next();
      });

      console.info('[SAB Plugin] SharedArrayBuffer headers configured (preview)');
    },
  };
}

/**
 * Check if SharedArrayBuffer is supported in current context.
 *
 * Useful for runtime detection to provide fallbacks.
 *
 * @returns true if SharedArrayBuffer is available
 */
export function checkSharedArrayBufferSupport(): boolean {
  if (typeof SharedArrayBuffer === 'undefined') {
    return false;
  }

  try {
    new SharedArrayBuffer(8);
    return true;
  } catch {
    return false;
  }
}

/**
 * Log SharedArrayBuffer support status to console.
 *
 * Call this in browser after page load to verify headers are working.
 */
export function logSharedArrayBufferStatus(): void {
  const supported = checkSharedArrayBufferSupport();

  if (supported) {
    console.info(
      '%c[SharedArrayBuffer] ✓ Enabled',
      'color: green; font-weight: bold'
    );
    console.info('  Zero-copy worker communication available');
  } else {
    console.warn(
      '%c[SharedArrayBuffer] ✗ Disabled',
      'color: orange; font-weight: bold'
    );
    console.warn(
      '  Falling back to postMessage (copy mode)\n' +
      '  To enable:\n' +
      '  1. Ensure HTTPS or localhost\n' +
      '  2. Verify COOP/COEP headers are set\n' +
      '  3. Restart server'
    );
  }

  // Also check cross-origin isolation
  if (typeof crossOriginIsolated !== 'undefined') {
    console.info('  crossOriginIsolated:', crossOriginIsolated);
  }
}
