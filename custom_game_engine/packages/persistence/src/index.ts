/**
 * Persistence Layer - Public API
 *
 * This package re-exports persistence functionality from @ai-village/core
 * to maintain backward compatibility.
 *
 * The canonical implementation lives in @ai-village/core/src/persistence/
 */

// Re-export everything from core's persistence exports
export {
  // Main service
  SaveLoadService,
  saveLoadService,

  // Save state management
  SaveStateManager,

  // Storage backends
  IndexedDBStorage,
  MemoryStorage,

  // Serialization
  worldSerializer,
  WorldSerializer,
  componentSerializerRegistry,
  BaseComponentSerializer,

  // Migrations
  migrationRegistry,
  MigrationRegistry,

  // Utilities
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

  // Validation
  validateSaveFile,
  validateWorldState,
  InvariantViolationError,

  // Compression
  compress,
  decompress,
  formatBytes,
  getCompressionRatio,

  // Errors
  MigrationError,
  SerializationError,
  ValidationError,
  ChecksumMismatchError,
} from '@ai-village/core';

// Migration utilities
export {
  migrateLocalSaves,
  checkMigrationStatus,
} from './LocalSavesMigration.js';
export type { MigrationProgress, MigrationOptions } from './LocalSavesMigration.js';

// Type re-exports
export type {
  SaveOptions,
  LoadResult,
  CanonEvent,
  CanonEventType,
  SaveMetadata,
  SaveState,
  SaveListEntry,
  TimelineSnapshot,
  Versioned,
  VersionedComponent,
  VersionedEntity,
  SaveFile,
  SaveFileHeader,
  PersistenceSaveMetadata,
  MultiverseSnapshot,
  MultiverseTime,
  UniverseSnapshot,
  UniverseTime,
  WorldSnapshot,
  StorageBackend,
  StorageInfo,
  Migration,
  MigrationContext,
  ComponentSerializer,
} from '@ai-village/core';
