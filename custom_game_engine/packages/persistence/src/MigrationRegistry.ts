/**
 * MigrationRegistry - Manages component schema migrations
 *
 * Provides a centralized registry for all migration paths.
 * Automatically chains migrations from old versions to current.
 */

import type { Migration, MigrationContext, MigrationResult } from './types.js';
import { MigrationError } from './types.js';

export class MigrationRegistry {
  private migrations: Migration[] = [];
  private migrationIndex: Map<string, Map<number, Migration>> = new Map();

  /**
   * Register a migration for a component.
   */
  register<T = unknown>(migration: Migration<T>): void {
    // Validate migration
    if (migration.fromVersion >= migration.toVersion) {
      throw new Error(
        `Invalid migration: fromVersion (${migration.fromVersion}) ` +
        `must be less than toVersion (${migration.toVersion})`
      );
    }

    // Check for duplicate
    const existing = this.getMigration(
      migration.component,
      migration.fromVersion,
      migration.toVersion
    );

    if (existing) {
      throw new Error(
        `Migration already registered for ${migration.component} ` +
        `v${migration.fromVersion} → v${migration.toVersion}`
      );
    }

    // Add to list
    this.migrations.push(migration);

    // Index by component and fromVersion
    if (!this.migrationIndex.has(migration.component)) {
      this.migrationIndex.set(migration.component, new Map());
    }

    this.migrationIndex.get(migration.component)!.set(
      migration.fromVersion,
      migration
    );

  }

  /**
   * Get a specific migration.
   */
  private getMigration(
    component: string,
    fromVersion: number,
    toVersion: number
  ): Migration | undefined {
    return this.migrations.find(
      m => m.component === component &&
           m.fromVersion === fromVersion &&
           m.toVersion === toVersion
    );
  }

  /**
   * Get migration path from version A to version B.
   * Returns ordered list of migrations to apply.
   */
  getMigrationPath(
    component: string,
    from: number,
    to: number
  ): Migration[] {
    if (from === to) return [];

    if (from > to) {
      throw new MigrationError(
        `Cannot migrate backwards from v${from} to v${to}`,
        component,
        from,
        to
      );
    }

    const path: Migration[] = [];
    let current = from;

    while (current < to) {
      const componentMigrations = this.migrationIndex.get(component);
      const next = componentMigrations?.get(current);

      if (!next) {
        throw new MigrationError(
          `No migration path for ${component} from v${from} to v${to}. ` +
          `Missing migration from v${current}. ` +
          `Available migrations: ${this.getAvailableMigrations(component)}`,
          component,
          from,
          to
        );
      }

      path.push(next);
      current = next.toVersion;
    }

    return path;
  }

  /**
   * Get human-readable list of available migrations for a component.
   */
  private getAvailableMigrations(component: string): string {
    const componentMigrations = this.migrations.filter(m => m.component === component);

    if (componentMigrations.length === 0) {
      return 'none';
    }

    return componentMigrations
      .map(m => `v${m.fromVersion}→v${m.toVersion}`)
      .join(', ');
  }

  /**
   * Apply migration path to data.
   */
  migrate<T = unknown>(
    component: string,
    data: unknown,
    fromVersion: number,
    toVersion: number,
    context?: MigrationContext
  ): T | MigrationResult {
    // No migration needed
    if (fromVersion === toVersion) {
      return data as T;
    }

    // Get migration path
    const path = this.getMigrationPath(component, fromVersion, toVersion);

    // Apply each migration in sequence
    let current: unknown = data;

    for (const migration of path) {
      try {

        current = migration.migrate(current, context);

        // Validate result
        if (current === null || current === undefined) {
          throw new MigrationError(
            `Migration produced null/undefined result`,
            component,
            migration.fromVersion,
            migration.toVersion
          );
        }
      } catch (error: unknown) {
        if (error instanceof MigrationError) {
          throw error;
        }

        throw new MigrationError(
          `Migration failed: ${(error as Error).message}`,
          component,
          migration.fromVersion,
          migration.toVersion
        );
      }
    }

    return current as T;
  }

  /**
   * Check if a migration path exists.
   */
  hasPath(component: string, from: number, to: number): boolean {
    try {
      this.getMigrationPath(component, from, to);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all migrations for a component.
   */
  getMigrations(component: string): Migration[] {
    return this.migrations.filter(m => m.component === component);
  }

  /**
   * Get the highest version for a component.
   */
  getLatestVersion(component: string): number {
    const migrations = this.getMigrations(component);

    if (migrations.length === 0) {
      return 0;
    }

    return Math.max(...migrations.map(m => m.toVersion));
  }

  /**
   * Clear all migrations (for testing).
   */
  clear(): void {
    this.migrations = [];
    this.migrationIndex.clear();
  }

  /**
   * Get statistics about registered migrations.
   */
  getStats(): {
    totalMigrations: number;
    components: string[];
    migrationsByComponent: Record<string, number>;
  } {
    const components = new Set(this.migrations.map(m => m.component));
    const migrationsByComponent: Record<string, number> = {};

    for (const component of components) {
      migrationsByComponent[component] = this.getMigrations(component).length;
    }

    return {
      totalMigrations: this.migrations.length,
      components: Array.from(components),
      migrationsByComponent,
    };
  }
}

// Global singleton instance
export const migrationRegistry = new MigrationRegistry();
