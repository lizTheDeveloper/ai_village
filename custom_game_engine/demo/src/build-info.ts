/**
 * Build-time constants injected by Vite production configs.
 * In dev, these default to 'dev'.
 */

declare const __BUILD_COMMIT__: string;
declare const __BUILD_TIMESTAMP__: string;
declare const __BUILD_VERSION__: string;

export const BUILD_COMMIT = typeof __BUILD_COMMIT__ !== 'undefined' ? __BUILD_COMMIT__ : 'dev';
export const BUILD_TIMESTAMP = typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : 'dev';
export const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';
