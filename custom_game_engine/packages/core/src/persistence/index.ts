/**
 * Persistence Layer - Public API
 *
 * Main entry point for saving/loading game state with support for:
 * - Forward-compatible migrations
 * - Multiple storage backends (IndexedDB, Memory)
 * - Multiverse snapshots with universe forking
 * - Component-level serialization
 */

// Main service exports
export { SaveLoadService, saveLoadService } from './SaveLoadService.js';
export type { SaveOptions, LoadResult } from './SaveLoadService.js';

// Save state management (for dev tools: save/load/fork/rewind)
export { SaveStateManager } from './SaveStateManager.js';
export type { SaveMetadata as SaveStateMetadata, SaveState, SaveListEntry } from './SaveStateManager.js';

// Storage backends
export { IndexedDBStorage } from './storage/IndexedDBStorage.js';
export { MemoryStorage } from './storage/MemoryStorage.js';

// Serialization
export { worldSerializer, WorldSerializer } from './WorldSerializer.js';
export { componentSerializerRegistry } from './ComponentSerializerRegistry.js';
export type { ComponentSerializer } from './types.js';
export { BaseComponentSerializer } from './ComponentSerializerRegistry.js';

// Migrations
export { migrationRegistry, MigrationRegistry } from './MigrationRegistry.js';

// Utilities
export {
  computeChecksum,
  computeChecksumSync,
  canonicalizeJSON,
  serializeBigInt,
  deserializeBigInt,
  assertDefined,
  assertType,
  assertFiniteNumber,
  assertOneOf,
  generateContentID,
  parseContentID,
  getGameVersion,
} from './utils.js';

// Type exports
export type {
  Versioned,
  VersionedComponent,
  VersionedEntity,
  SaveFile,
  SaveFileHeader,
  SaveMetadata,
  MultiverseSnapshot,
  MultiverseTime,
  UniverseSnapshot,
  UniverseTime,
  WorldSnapshot,
  StorageBackend,
  StorageInfo,
  Migration,
  MigrationContext,
} from './types.js';

// Validation
export { validateSaveFile, validateWorldState, InvariantViolationError } from './InvariantChecker.js';

// Compression
export { compress, decompress, formatBytes, getCompressionRatio } from './compression.js';

// Error exports
export {
  MigrationError,
  SerializationError,
  ValidationError,
  ChecksumMismatchError,
} from './types.js';
