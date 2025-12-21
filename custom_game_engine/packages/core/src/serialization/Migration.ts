import type { ComponentType } from '../types.js';
import type { SaveFile } from './SaveFile.js';

/**
 * Migrate save file between versions.
 */
export interface SaveMigration {
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly description: string;

  migrate(save: SaveFile): SaveFile;
}

/**
 * Migrate component data between schema versions.
 */
export interface ComponentMigration {
  readonly componentType: ComponentType;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly description: string;

  migrate(data: Readonly<Record<string, unknown>>): Record<string, unknown>;
}

export interface ValidationReport {
  readonly valid: boolean;
  readonly saveVersion: number;
  readonly currentVersion: number;
  readonly migrationRequired: boolean;
  readonly migrationsNeeded: number;
  readonly errors: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
}
