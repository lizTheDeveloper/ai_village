/**
 * Browser stub for Node.js 'fs' module
 * Provides no-op implementations for browser compatibility
 */

export function existsSync(path: string): boolean {
  console.warn('[fs stub] existsSync called in browser - returning false');
  return false;
}

export function mkdirSync(path: string, options?: any): void {
  console.warn('[fs stub] mkdirSync called in browser - no-op');
}

export function writeFileSync(path: string, data: any, options?: any): void {
  console.warn('[fs stub] writeFileSync called in browser - no-op');
}

export function readFileSync(path: string, options?: any): string {
  console.warn('[fs stub] readFileSync called in browser - returning empty string');
  return '';
}

export function appendFileSync(path: string, data: any, options?: any): void {
  console.warn('[fs stub] appendFileSync called in browser - no-op');
}

// Default export for compatibility
export default {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  appendFileSync,
};
