#!/usr/bin/env ts-node
/**
 * PixelLab Queue Processor
 *
 * Continuously processes the pixellab-batch-manifest.json queue,
 * keeping the PixelLab job queue full (up to 20 concurrent jobs).
 *
 * Usage: npx ts-node pixellab-queue-processor.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const MANIFEST_PATH = path.join(__dirname, 'pixellab-batch-manifest.json');
const STATE_PATH = path.join(__dirname, 'pixellab-batch-state.json');
const MAX_CONCURRENT_JOBS = 20;
const POLL_INTERVAL_MS = 10000; // Check every 10 seconds

interface QueueState {
  version: number;
  lastRun: string;
  pendingJobs: {
    characterIds: Record<string, string>; // item_id -> job_id
    tilesetIds: Record<string, string>;
    isometricIds: Record<string, string>;
    objectIds: Record<string, string>;
  };
  completedToday: number;
  dailyLimit: number;
}

interface ManifestItem {
  id: string;
  desc?: string;
  description?: string;
  lower?: string;
  upper?: string;
  transition?: string;
  stages?: number;
}

interface JobStatus {
  itemId: string;
  jobId: string;
  type: 'character' | 'tileset' | 'isometric' | 'object';
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

class PixelLabQueueProcessor {
  private manifest: any;
  private state: QueueState;
  private activeJobs: Map<string, JobStatus> = new Map();

  constructor() {
    this.manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    this.state = this.loadState();
  }

  private loadState(): QueueState {
    if (fs.existsSync(STATE_PATH)) {
      return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    }
    return {
      version: 1,
      lastRun: new Date().toISOString(),
      pendingJobs: {
        characterIds: {},
        tilesetIds: {},
        isometricIds: {},
        objectIds: {},
      },
      completedToday: 0,
      dailyLimit: 5000,
    };
  }

  private saveState(): void {
    this.state.lastRun = new Date().toISOString();
    fs.writeFileSync(STATE_PATH, JSON.stringify(this.state, null, 2));
  }

  private getAllPendingItems(): Array<{ type: string; category: string; item: ManifestItem }> {
    const pending: Array<{ type: string; category: string; item: ManifestItem }> = [];

    // Humanoids
    for (const [race, data] of Object.entries(this.manifest.humanoids || {})) {
      if (race === 'description') continue;
      const raceData = data as any;
      for (const item of raceData.pending || []) {
        pending.push({ type: 'character', category: `humanoids/${race}`, item });
      }
    }

    // Animals
    for (const [category, data] of Object.entries(this.manifest.animals || {})) {
      if (category === 'description') continue;
      const catData = data as any;
      for (const item of catData.pending || []) {
        pending.push({ type: 'character', category: `animals/${category}`, item });
      }
    }

    // Building tiles (isometric)
    for (const [category, data] of Object.entries(this.manifest.building_tiles || {})) {
      if (category === 'description') continue;
      const catData = data as any;
      for (const item of catData.pending || []) {
        pending.push({ type: 'isometric', category: `building_tiles/${category}`, item });
      }
    }

    // Tilesets
    for (const [category, data] of Object.entries(this.manifest.tilesets || {})) {
      if (category === 'description') continue;
      const catData = data as any;
      for (const item of catData.pending || []) {
        pending.push({ type: 'tileset', category: `tilesets/${category}`, item });
      }
    }

    // Map objects
    for (const item of this.manifest.map_objects?.pending || []) {
      pending.push({ type: 'object', category: 'map_objects', item });
    }

    return pending;
  }

  private async generateCharacter(item: ManifestItem, category: string): Promise<string> {
    console.log(`[Character] Generating ${item.id} (${category})...`);

    // Determine if this is an animal and needs quadruped description
    const isAnimal = category.startsWith('animals/');
    let description = item.desc || item.description || '';

    if (isAnimal && !description.includes('quadruped') && !description.includes('four legs')) {
      // Enhance animal descriptions to be explicitly quadruped
      description = `Quadruped ${description}, realistic animal body on all four legs, top-down view`;
    }

    // Extract proportions from manifest if available
    const proportions = (item as any).proportions || { type: 'preset', name: 'default' };

    // This is a placeholder - in real implementation, call the PixelLab MCP tool
    // For now, return a mock job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`  → Job ID: ${jobId}`);
    return jobId;
  }

  private async generateTileset(item: ManifestItem): Promise<string> {
    console.log(`[Tileset] Generating ${item.id}...`);
    const jobId = `tileset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`  → Job ID: ${jobId}`);
    return jobId;
  }

  private async generateIsometric(item: ManifestItem): Promise<string> {
    console.log(`[Isometric] Generating ${item.id}...`);
    const jobId = `iso_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`  → Job ID: ${jobId}`);
    return jobId;
  }

  private async generateObject(item: ManifestItem): Promise<string> {
    console.log(`[Object] Generating ${item.id}...`);
    const jobId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`  → Job ID: ${jobId}`);
    return jobId;
  }

  private async checkJobStatus(jobId: string, type: string): Promise<'pending' | 'processing' | 'completed' | 'failed'> {
    // Placeholder - in real implementation, check job status via MCP tools
    // For now, randomly complete jobs after a delay
    return Math.random() > 0.9 ? 'completed' : 'processing';
  }

  private async processQueue(): Promise<void> {
    // Get all pending items from manifest
    const pendingItems = this.getAllPendingItems();

    console.log(`\n=== Queue Status ===`);
    console.log(`Pending items: ${pendingItems.length}`);
    console.log(`Active jobs: ${this.activeJobs.size}`);
    console.log(`Completed today: ${this.state.completedToday}/${this.state.dailyLimit}`);

    // Check status of active jobs
    const completedJobs: string[] = [];
    for (const [itemId, job] of this.activeJobs.entries()) {
      const status = await this.checkJobStatus(job.jobId, job.type);
      if (status === 'completed') {
        console.log(`✓ Completed: ${itemId}`);
        completedJobs.push(itemId);
        this.state.completedToday++;

        // Move from pending to completed in manifest
        // (This would need to modify the manifest file)
      } else if (status === 'failed') {
        console.log(`✗ Failed: ${itemId}`);
        completedJobs.push(itemId);
      }
    }

    // Remove completed jobs from active tracking
    for (const itemId of completedJobs) {
      this.activeJobs.delete(itemId);
    }

    // Fill queue with new jobs up to MAX_CONCURRENT_JOBS
    const slotsAvailable = MAX_CONCURRENT_JOBS - this.activeJobs.size;
    console.log(`\nSlots available: ${slotsAvailable}`);

    if (slotsAvailable > 0 && pendingItems.length > 0) {
      const itemsToProcess = pendingItems.slice(0, slotsAvailable);

      for (const { type, category, item } of itemsToProcess) {
        try {
          let jobId: string;

          switch (type) {
            case 'character':
              jobId = await this.generateCharacter(item, category);
              break;
            case 'tileset':
              jobId = await this.generateTileset(item);
              break;
            case 'isometric':
              jobId = await this.generateIsometric(item);
              break;
            case 'object':
              jobId = await this.generateObject(item);
              break;
            default:
              continue;
          }

          this.activeJobs.set(item.id, {
            itemId: item.id,
            jobId,
            type: type as any,
            status: 'processing',
          });

          // Track in state
          if (type === 'character') {
            this.state.pendingJobs.characterIds[item.id] = jobId;
          } else if (type === 'tileset') {
            this.state.pendingJobs.tilesetIds[item.id] = jobId;
          } else if (type === 'isometric') {
            this.state.pendingJobs.isometricIds[item.id] = jobId;
          } else if (type === 'object') {
            this.state.pendingJobs.objectIds[item.id] = jobId;
          }

        } catch (error) {
          console.error(`Failed to generate ${item.id}:`, error);
        }
      }
    }

    this.saveState();
  }

  async run(): Promise<void> {
    console.log('🚀 PixelLab Queue Processor Started');
    console.log(`Max concurrent jobs: ${MAX_CONCURRENT_JOBS}`);
    console.log(`Poll interval: ${POLL_INTERVAL_MS}ms`);
    console.log(`Daily limit: ${this.state.dailyLimit}`);
    console.log(`Completed today: ${this.state.completedToday}`);

    while (true) {
      try {
        await this.processQueue();

        // Check if we're done
        const pendingItems = this.getAllPendingItems();
        if (pendingItems.length === 0 && this.activeJobs.size === 0) {
          console.log('\n✅ All items processed!');
          break;
        }

        // Check daily limit
        if (this.state.completedToday >= this.state.dailyLimit) {
          console.log('\n⚠️  Daily limit reached!');
          break;
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

      } catch (error) {
        console.error('Error in queue processor:', error);
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS * 2));
      }
    }

    console.log('\n🏁 Queue processor finished');
  }
}

// Run the processor
const processor = new PixelLabQueueProcessor();
processor.run().catch(console.error);
