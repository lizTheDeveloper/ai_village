/**
 * Persistence utilities - Checksums, hashing, validation
 */

import type { Versioned } from './types.js';

/**
 * Compute SHA-256 checksum of data.
 */
export async function computeChecksum(data: unknown): Promise<string> {
  // Canonicalize data (deterministic JSON)
  const canonical = canonicalizeJSON(data);

  // Compute SHA-256
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(canonical);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // Browser/Node with Web Crypto API
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer.buffer as ArrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Fallback for environments without crypto.subtle
    // Simple hash (NOT cryptographically secure, but deterministic)
    return simpleHash(canonical);
  }
}

/**
 * Synchronous checksum for environments without crypto.subtle.
 */
export function computeChecksumSync(data: unknown): string {
  const canonical = canonicalizeJSON(data);
  return simpleHash(canonical);
}

/**
 * Simple deterministic hash (NOT cryptographically secure).
 * Used as fallback when crypto.subtle unavailable.
 */
function simpleHash(str: string): string {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to hex string
  const hex = (hash >>> 0).toString(16);
  return hex.padStart(8, '0');
}

/**
 * Canonicalize JSON for deterministic hashing.
 * Sorts object keys, removes whitespace.
 */
export function canonicalizeJSON(data: unknown): string {
  return JSON.stringify(data, (_key, value) => {
    // Sort object keys
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(value).sort()) {
        sorted[key] = value[key];
      }
      return sorted;
    }
    return value;
  });
}

/**
 * Verify checksum matches data.
 */
export async function verifyChecksum(
  data: unknown,
  expectedChecksum: string
): Promise<boolean> {
  const actualChecksum = await computeChecksum(data);
  return actualChecksum === expectedChecksum;
}

/**
 * Verify checksum (synchronous).
 */
export function verifyChecksumSync(
  data: unknown,
  expectedChecksum: string
): boolean {
  const actualChecksum = computeChecksumSync(data);
  return actualChecksum === expectedChecksum;
}

/**
 * Serialize bigint to string.
 */
export function serializeBigInt(value: bigint): string {
  return value.toString();
}

/**
 * Deserialize bigint from string.
 */
export function deserializeBigInt(value: string): bigint {
  try {
    return BigInt(value);
  } catch (error) {
    throw new Error(
      `Failed to deserialize bigint from "${value}": ${(error as Error).message}`
    );
  }
}

/**
 * Deep clone object (uses structured clone if available).
 */
export function deepClone<T>(obj: T): T {
  if (typeof structuredClone !== 'undefined') {
    return structuredClone(obj);
  }

  // Fallback: JSON round-trip (loses functions, symbols, etc.)
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Validate versioned structure.
 */
export function validateVersioned(data: unknown): data is Versioned {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.$schema !== 'string') {
    throw new Error(`$schema must be string, got ${typeof obj.$schema}`);
  }

  if (typeof obj.$version !== 'number') {
    throw new Error(`$version must be number, got ${typeof obj.$version}`);
  }

  if (!Number.isInteger(obj.$version) || obj.$version < 0) {
    throw new Error(`$version must be non-negative integer, got ${obj.$version}`);
  }

  return true;
}

/**
 * Assert that a value is defined (not null/undefined).
 * Throws with clear error message if not.
 */
export function assertDefined<T>(
  value: T | null | undefined,
  fieldName: string,
  componentType?: string
): asserts value is T {
  if (value === null || value === undefined) {
    const prefix = componentType ? `${componentType}.` : '';
    throw new Error(
      `${prefix}${fieldName} is required but was ${value}. ` +
      `This save file may be corrupted.`
    );
  }
}

/**
 * Assert that a value has the expected type.
 */
export function assertType(
  value: unknown,
  expectedType: string,
  fieldName: string,
  componentType?: string
): void {
  const actualType = typeof value;

  if (actualType !== expectedType) {
    const prefix = componentType ? `${componentType}.` : '';
    throw new Error(
      `${prefix}${fieldName} must be ${expectedType}, got ${actualType}. ` +
      `This save file may be corrupted.`
    );
  }
}

/**
 * Assert that a number is finite and not NaN.
 */
export function assertFiniteNumber(
  value: unknown,
  fieldName: string,
  componentType?: string
): asserts value is number {
  assertType(value, 'number', fieldName, componentType);

  if (!Number.isFinite(value as number)) {
    const prefix = componentType ? `${componentType}.` : '';
    throw new Error(
      `${prefix}${fieldName} must be finite number, got ${value}. ` +
      `This save file may be corrupted.`
    );
  }
}

/**
 * Assert that a value is in a set of allowed values.
 */
export function assertOneOf<T>(
  value: unknown,
  allowed: readonly T[],
  fieldName: string,
  componentType?: string
): asserts value is T {
  if (!allowed.includes(value as T)) {
    const prefix = componentType ? `${componentType}.` : '';
    throw new Error(
      `${prefix}${fieldName} must be one of [${allowed.join(', ')}], ` +
      `got ${JSON.stringify(value)}. ` +
      `This save file may be corrupted.`
    );
  }
}

/**
 * Get game version from package.json or environment.
 */
export function getGameVersion(): string {
  // Try to get from environment variable
  if (typeof process !== 'undefined' && process.env.GAME_VERSION) {
    return process.env.GAME_VERSION;
  }

  // Fallback to hardcoded version
  // TODO: Read from package.json at build time
  return '0.1.0';
}

/**
 * Generate a content-addressable ID.
 * Format: {type}:{hash}:{universe}
 */
export function generateContentID(
  type: string,
  content: unknown,
  universeId?: string
): string {
  const hash = computeChecksumSync(content);
  const shortHash = hash.substring(0, 8);  // First 8 chars

  if (universeId) {
    return `${type}:${shortHash}:universe:${universeId}`;
  }

  return `${type}:${shortHash}`;
}

/**
 * Parse a content-addressable ID.
 */
export function parseContentID(id: string): {
  type: string;
  hash: string;
  universeId?: string;
} {
  const parts = id.split(':');

  if (parts.length < 2) {
    throw new Error(`Invalid content ID format: ${id}`);
  }

  const result = {
    type: parts[0]!,  // Safe: validated parts.length >= 2
    hash: parts[1]!,  // Safe: validated parts.length >= 2
    universeId: undefined as string | undefined,
  };

  if (parts.length >= 4 && parts[2] === 'universe') {
    result.universeId = parts[3];
  }

  return result;
}

/**
 * Format bytes as human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format duration in seconds as human-readable string.
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];

  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}
