/**
 * Browser stub for Node.js 'path' module
 * Provides minimal implementations for browser compatibility
 */

export function join(...paths: string[]): string {
  return paths.filter(Boolean).join('/').replace(/\/+/g, '/');
}

export function resolve(...paths: string[]): string {
  return join(...paths);
}

export function dirname(filepath: string): string {
  const parts = filepath.split('/');
  parts.pop();
  return parts.join('/') || '/';
}

export function basename(filepath: string, ext?: string): string {
  const parts = filepath.split('/');
  let name = parts[parts.length - 1] || '';
  if (ext && name.endsWith(ext)) {
    name = name.slice(0, -ext.length);
  }
  return name;
}

export function extname(filepath: string): string {
  const parts = filepath.split('/');
  const filename = parts[parts.length - 1] || '';
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex > 0 ? filename.slice(dotIndex) : '';
}

// Default export for compatibility
export default {
  join,
  resolve,
  dirname,
  basename,
  extname,
};
