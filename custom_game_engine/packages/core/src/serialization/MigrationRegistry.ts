import type {
  SaveMigration,
  ComponentMigration,
  ValidationReport,
} from './Migration.js';
import type { SaveFile } from './SaveFile.js';
import { CURRENT_SAVE_VERSION } from '../types.js';

/**
 * Registry for migrations.
 */
export interface IMigrationRegistry {
  registerSaveMigration(migration: SaveMigration): void;
  registerComponentMigration(migration: ComponentMigration): void;

  /** Get migrations needed for a save */
  getMigrationsNeeded(save: SaveFile): ReadonlyArray<SaveMigration>;

  /** Apply all needed migrations */
  migrate(save: SaveFile): SaveFile;

  /** Validate a save file */
  validate(save: SaveFile): ValidationReport;
}

/**
 * Implementation of MigrationRegistry.
 */
export class MigrationRegistry implements IMigrationRegistry {
  private saveMigrations = new Map<number, SaveMigration>();
  private componentMigrations = new Map<string, ComponentMigration[]>();

  registerSaveMigration(migration: SaveMigration): void {
    const key = migration.fromVersion;
    if (this.saveMigrations.has(key)) {
      throw new Error(
        `Save migration from version ${key} is already registered`
      );
    }
    this.saveMigrations.set(key, migration);
  }

  registerComponentMigration(migration: ComponentMigration): void {
    if (!this.componentMigrations.has(migration.componentType)) {
      this.componentMigrations.set(migration.componentType, []);
    }
    this.componentMigrations.get(migration.componentType)!.push(migration);
  }

  getMigrationsNeeded(save: SaveFile): ReadonlyArray<SaveMigration> {
    const migrations: SaveMigration[] = [];
    let version = save.header.saveVersion;

    while (version < CURRENT_SAVE_VERSION) {
      const migration = this.saveMigrations.get(version);
      if (!migration) {
        throw new Error(`No migration found from version ${version}`);
      }
      migrations.push(migration);
      version = migration.toVersion;
    }

    return migrations;
  }

  migrate(save: SaveFile): SaveFile {
    const migrations = this.getMigrationsNeeded(save);
    let current = save;

    for (const migration of migrations) {
      current = migration.migrate(current);
    }

    return current;
  }

  validate(save: SaveFile): ValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];

    const saveVersion = save.header.saveVersion;
    const currentVersion = CURRENT_SAVE_VERSION;

    if (saveVersion > currentVersion) {
      errors.push(
        `Save version ${saveVersion} is newer than current version ${currentVersion}`
      );
    }

    const migrationRequired = saveVersion < currentVersion;
    let migrationsNeeded = 0;

    if (migrationRequired) {
      try {
        const migrations = this.getMigrationsNeeded(save);
        migrationsNeeded = migrations.length;
      } catch (error) {
        errors.push(
          `Cannot migrate: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    const valid = errors.length === 0;

    return {
      valid,
      saveVersion,
      currentVersion,
      migrationRequired,
      migrationsNeeded,
      errors,
      warnings,
    };
  }
}
