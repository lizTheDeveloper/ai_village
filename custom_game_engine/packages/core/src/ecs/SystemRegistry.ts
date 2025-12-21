import type { SystemId } from '../types.js';
import type { System, SystemStats } from './System.js';

/**
 * Registry for game systems.
 */
export interface ISystemRegistry {
  register(system: System): void;
  unregister(systemId: SystemId): void;
  get(systemId: SystemId): System | undefined;

  /** Get systems sorted by priority */
  getSorted(): ReadonlyArray<System>;

  enable(systemId: SystemId): void;
  disable(systemId: SystemId): void;
  isEnabled(systemId: SystemId): boolean;

  /** Performance stats */
  getStats(): ReadonlyMap<SystemId, SystemStats>;

  /** Update stats for a system */
  recordStats(systemId: SystemId, stats: Partial<SystemStats>): void;
}

interface SystemEntry {
  system: System;
  enabled: boolean;
  stats: SystemStats;
}

/**
 * Implementation of SystemRegistry.
 */
export class SystemRegistry implements ISystemRegistry {
  private systems = new Map<SystemId, SystemEntry>();
  private sortedCache: System[] | null = null;

  register(system: System): void {
    if (this.systems.has(system.id)) {
      throw new Error(`System "${system.id}" is already registered`);
    }

    this.systems.set(system.id, {
      system,
      enabled: true,
      stats: {
        systemId: system.id,
        enabled: true,
        avgTickTimeMs: 0,
        maxTickTimeMs: 0,
        lastEntityCount: 0,
        lastEventCount: 0,
      },
    });

    this.sortedCache = null;
  }

  unregister(systemId: SystemId): void {
    const entry = this.systems.get(systemId);
    if (!entry) {
      throw new Error(`System "${systemId}" is not registered`);
    }

    entry.system.cleanup?.();
    this.systems.delete(systemId);
    this.sortedCache = null;
  }

  get(systemId: SystemId): System | undefined {
    return this.systems.get(systemId)?.system;
  }

  getSorted(): ReadonlyArray<System> {
    if (!this.sortedCache) {
      this.sortedCache = Array.from(this.systems.values())
        .filter((entry) => entry.enabled)
        .map((entry) => entry.system)
        .sort((a, b) => a.priority - b.priority);
    }
    return this.sortedCache;
  }

  enable(systemId: SystemId): void {
    const entry = this.systems.get(systemId);
    if (!entry) {
      throw new Error(`System "${systemId}" is not registered`);
    }
    if (!entry.enabled) {
      entry.enabled = true;
      entry.stats = { ...entry.stats, enabled: true };
      this.sortedCache = null;
    }
  }

  disable(systemId: SystemId): void {
    const entry = this.systems.get(systemId);
    if (!entry) {
      throw new Error(`System "${systemId}" is not registered`);
    }
    if (entry.enabled) {
      entry.enabled = false;
      entry.stats = { ...entry.stats, enabled: false };
      this.sortedCache = null;
    }
  }

  isEnabled(systemId: SystemId): boolean {
    return this.systems.get(systemId)?.enabled ?? false;
  }

  getStats(): ReadonlyMap<SystemId, SystemStats> {
    const stats = new Map<SystemId, SystemStats>();
    for (const [id, entry] of this.systems) {
      stats.set(id, entry.stats);
    }
    return stats;
  }

  recordStats(systemId: SystemId, partialStats: Partial<SystemStats>): void {
    const entry = this.systems.get(systemId);
    if (!entry) return;

    entry.stats = { ...entry.stats, ...partialStats };
  }
}
