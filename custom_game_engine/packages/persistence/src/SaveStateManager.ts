/**
 * SaveStateManager - Manages save states for time manipulation dev tools
 *
 * Provides save/load/fork/rewind capabilities for headless games and dev tools.
 * Integrates with WorldSerializer for complete state snapshots.
 *
 * Browser-compatible: Save/load operations are no-ops in browser, only work in Node.js.
 */

import type { World } from '@ai-village/core';
import { WorldImpl } from '@ai-village/core';
import { EventBusImpl } from '@ai-village/core';
import { worldSerializer } from './WorldSerializer.js';

// Check if running in Node.js
const isNode = typeof process !== 'undefined' && process.versions?.node;

// Lazy-load Node.js modules only when needed
let fs: typeof import('fs') | null = null;
let path: typeof import('path') | null = null;
let zlib: typeof import('zlib') | null = null;
let util: typeof import('util') | null = null;

// Promisified functions (initialized when modules are loaded)
let gzip: ((buffer: string | Buffer) => Promise<Buffer>) | null = null;
let gunzip: ((buffer: Buffer) => Promise<Buffer>) | null = null;
let writeFile: ((path: string, data: any) => Promise<void>) | null = null;
let readFile: ((path: string) => Promise<Buffer>) | null = null;
let mkdir: ((path: string, options?: any) => Promise<void>) | null = null;
let readdir: ((path: string) => Promise<string[]>) | null = null;
let unlink: ((path: string) => Promise<void>) | null = null;
let stat: ((path: string) => Promise<any>) | null = null;

async function ensureNodeModules(): Promise<void> {
  if (!isNode || fs) return;

  fs = await import('fs');
  path = await import('path');
  zlib = await import('zlib');
  util = await import('util');

  gzip = util.promisify(zlib.gzip);
  gunzip = util.promisify(zlib.gunzip);
  writeFile = util.promisify(fs.writeFile);
  readFile = util.promisify(fs.readFile);
  mkdir = util.promisify(fs.mkdir);
  readdir = util.promisify(fs.readdir);
  unlink = util.promisify(fs.unlink);
  stat = util.promisify(fs.stat);
}

export interface SaveMetadata {
  saveName: string;
  sessionId: string;
  timestamp: number;
  day: number;
  tick: number;
  description?: string;
  agentCount: number;
  compressed: boolean;
}

export interface SaveState {
  metadata: SaveMetadata;
  snapshot: any; // UniverseSnapshot from WorldSerializer
}

export interface SaveListEntry {
  saveName: string;
  timestamp: number;
  day: number;
  tick: number;
  description?: string;
  agentCount: number;
  size: number; // File size in bytes
}

export class SaveStateManager {
  private savesDir: string;

  constructor(savesDir: string = 'saves') {
    this.savesDir = savesDir;
  }

  /**
   * Initialize saves directory
   */
  async initialize(): Promise<void> {
    if (!isNode) return;
    await ensureNodeModules();
    if (!fs || !mkdir) return;

    if (!fs.existsSync(this.savesDir)) {
      await mkdir(this.savesDir, { recursive: true });
    }
  }

  /**
   * Save current world state
   */
  async saveState(
    world: World,
    sessionId: string,
    options: {
      saveName?: string;
      description?: string;
      autoIncrement?: boolean;
    } = {}
  ): Promise<SaveMetadata> {
    // Browser no-op
    if (!isNode || !fs || !path || !mkdir || !gzip || !writeFile) {
      console.warn('[SaveStateManager] Save operations not available in browser');
      return {
        saveName: options.saveName || 'browser_save',
        sessionId,
        timestamp: Date.now(),
        day: 0,
        tick: 0,
        description: options.description,
        agentCount: 0,
        compressed: false,
      };
    }

    await this.initialize();

    const sessionDir = path.join(this.savesDir, sessionId);
    if (!fs.existsSync(sessionDir)) {
      await mkdir(sessionDir, { recursive: true });
    }

    // Generate save name
    let saveName = options.saveName;
    if (!saveName) {
      if (options.autoIncrement) {
        const saves = await this.listSaves(sessionId);
        const maxNum = saves.reduce((max, save) => {
          const match = save.saveName.match(/^save_(\d+)$/);
          if (match && match[1]) {
            return Math.max(max, parseInt(match[1], 10));
          }
          return max;
        }, 0);
        saveName = `save_${String(maxNum + 1).padStart(3, '0')}`;
      } else {
        saveName = `save_${Date.now()}`;
      }
    }

    // Serialize world (use default universe ID and name for saves)
    const universeId = sessionId;
    const universeName = `${sessionId} Save: ${saveName}`;
    const snapshot = await worldSerializer.serializeWorld(world, universeId, universeName);

    // Get time info
    const timeEntities = world.query().with('time' as any).executeEntities();
    const timeComp = timeEntities[0]?.getComponent('time' as any) as any;
    const day = timeComp?.currentDay ?? 0;
    const tick = timeComp?.tickCount ?? 0;

    // Count agents
    const agentCount = world.query().with('agent' as any).executeEntities().length;

    // Create metadata
    const metadata: SaveMetadata = {
      saveName,
      sessionId,
      timestamp: Date.now(),
      day,
      tick,
      description: options.description,
      agentCount,
      compressed: true,
    };

    // Create save state
    const saveState: SaveState = {
      metadata,
      snapshot,
    };

    // Compress and save
    const json = JSON.stringify(saveState);
    const compressed = await gzip(json);
    const filePath = path.join(sessionDir, `${saveName}.json.gz`);
    await writeFile(filePath, compressed);


    return metadata;
  }

  /**
   * Load a saved state
   */
  async loadState(sessionId: string, saveName: string): Promise<SaveState> {
    if (!isNode || !fs || !path || !readFile || !gunzip) {
      throw new Error('Load operations not available in browser');
    }

    const filePath = path.join(this.savesDir, sessionId, `${saveName}.json.gz`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Save not found: ${sessionId}/${saveName}`);
    }

    const compressed = await readFile(filePath);
    const json = await gunzip(compressed);
    const saveState: SaveState = JSON.parse(json.toString());


    return saveState;
  }

  /**
   * List all saves for a session
   */
  async listSaves(sessionId: string): Promise<SaveListEntry[]> {
    if (!isNode || !fs || !path || !readdir || !stat) {
      return [];
    }

    const sessionDir = path.join(this.savesDir, sessionId);

    if (!fs.existsSync(sessionDir)) {
      return [];
    }

    const files = await readdir(sessionDir);
    const saves: SaveListEntry[] = [];

    for (const file of files) {
      if (!file.endsWith('.json.gz')) continue;

      const filePath = path.join(sessionDir, file);
      const stats = await stat(filePath);
      const saveName = file.replace('.json.gz', '');

      try {
        const saveState = await this.loadState(sessionId, saveName);
        saves.push({
          saveName,
          timestamp: saveState.metadata.timestamp,
          day: saveState.metadata.day,
          tick: saveState.metadata.tick,
          description: saveState.metadata.description,
          agentCount: saveState.metadata.agentCount,
          size: stats.size,
        });
      } catch (error) {
        console.error(`[SaveStateManager] Failed to load metadata for ${saveName}:`, error);
      }
    }

    // Sort by timestamp descending (newest first)
    saves.sort((a, b) => b.timestamp - a.timestamp);

    return saves;
  }

  /**
   * Delete a save
   */
  async deleteSave(sessionId: string, saveName: string): Promise<void> {
    if (!isNode || !fs || !path || !unlink) {
      console.warn('[SaveStateManager] Delete operations not available in browser');
      return;
    }

    const filePath = path.join(this.savesDir, sessionId, `${saveName}.json.gz`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Save not found: ${sessionId}/${saveName}`);
    }

    await unlink(filePath);
  }

  /**
   * Fork a new session from a save
   */
  async forkState(
    sourceSessionId: string,
    saveName: string,
    newSessionId: string,
    description?: string
  ): Promise<SaveMetadata> {
    if (!isNode || !fs || !path || !mkdir || !gzip || !writeFile) {
      throw new Error('Fork operations not available in browser');
    }

    // Load the source save
    const sourceState = await this.loadState(sourceSessionId, saveName);

    // Create new session directory
    const sessionDir = path.join(this.savesDir, newSessionId);
    if (!fs.existsSync(sessionDir)) {
      await mkdir(sessionDir, { recursive: true });
    }

    // Create forked save metadata
    const forkedMetadata: SaveMetadata = {
      ...sourceState.metadata,
      saveName: 'fork_initial',
      sessionId: newSessionId,
      timestamp: Date.now(),
      description: description || `Forked from ${sourceSessionId}/${saveName}`,
    };

    const forkedState: SaveState = {
      metadata: forkedMetadata,
      snapshot: sourceState.snapshot,
    };

    // Save forked state
    const json = JSON.stringify(forkedState);
    const compressed = await gzip(json);
    const filePath = path.join(sessionDir, 'fork_initial.json.gz');
    await writeFile(filePath, compressed);


    return forkedMetadata;
  }

  /**
   * Restore world from save state
   */
  async restoreWorld(saveState: SaveState): Promise<World> {
    const eventBus = new EventBusImpl();
    const world = new WorldImpl(eventBus);
    await worldSerializer.deserializeWorld(saveState.snapshot, world);
    return world;
  }

  /**
   * Get save file path
   */
  getSavePath(sessionId: string, saveName: string): string {
    if (!isNode || !path) return '';
    return path.join(this.savesDir, sessionId, `${saveName}.json.gz`);
  }

  /**
   * Check if a save exists
   */
  saveExists(sessionId: string, saveName: string): boolean {
    if (!isNode || !fs) return false;
    return fs.existsSync(this.getSavePath(sessionId, saveName));
  }

  /**
   * Get total size of all saves for a session
   */
  async getSessionSaveSize(sessionId: string): Promise<number> {
    if (!isNode || !fs || !path || !readdir || !stat) {
      return 0;
    }

    const sessionDir = path.join(this.savesDir, sessionId);

    if (!fs.existsSync(sessionDir)) {
      return 0;
    }

    const files = await readdir(sessionDir);
    let totalSize = 0;

    for (const file of files) {
      if (!file.endsWith('.json.gz')) continue;
      const filePath = path.join(sessionDir, file);
      const stats = await stat(filePath);
      totalSize += stats.size;
    }

    return totalSize;
  }

  /**
   * Delete all saves for a session
   */
  async deleteAllSaves(sessionId: string): Promise<number> {
    if (!isNode || !fs || !path || !readdir || !unlink) {
      return 0;
    }

    const sessionDir = path.join(this.savesDir, sessionId);

    if (!fs.existsSync(sessionDir)) {
      return 0;
    }

    const files = await readdir(sessionDir);
    let count = 0;

    for (const file of files) {
      if (!file.endsWith('.json.gz')) continue;
      const filePath = path.join(sessionDir, file);
      await unlink(filePath);
      count++;
    }


    return count;
  }
}
