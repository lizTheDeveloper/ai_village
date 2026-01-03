#!/usr/bin/env ts-node
/**
 * PixelLab Queue Worker
 * Processes the batch manifest and keeps the generation queue full
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// ES module path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

const PIXELLAB_API_KEY = process.env.PIXELLAB_API_KEY;
const MANIFEST_PATH = path.join(__dirname, 'pixellab-batch-manifest.json');
const STATE_PATH = path.join(__dirname, 'pixellab-batch-state.json');
const MAX_CONCURRENT = 20;
const POLL_INTERVAL = 30000; // 30 seconds

if (!PIXELLAB_API_KEY) {
  console.error('❌ PIXELLAB_API_KEY not found in environment');
  process.exit(1);
}

interface JobTracker {
  itemId: string;
  itemType: string;
  jobId: string;
  startTime: number;
}

class QueueWorker {
  private manifest: any;
  private activeJobs: Map<string, JobTracker> = new Map();
  private completedIds: Set<string> = new Set();
  private failedIds: Set<string> = new Set();

  constructor() {
    this.manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    this.loadCompletedIds();
  }

  private loadCompletedIds(): void {
    // Load IDs that have already been completed
    // This prevents re-generating items
    if (fs.existsSync(STATE_PATH)) {
      const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
      // Parse state to find completed IDs
    }
  }

  private async createCharacter(item: any, category: string): Promise<string> {
    const isAnimal = category.startsWith('animals/');
    let description = item.desc || item.description || '';

    // Fix animal descriptions to be quadruped
    if (isAnimal) {
      const animalType = item.id.split('_')[0]; // e.g., "cow", "horse"
      description = `Realistic ${animalType} as a quadruped animal on all four legs, ${description}, natural animal pose, top-down view`;
    }

    const response = await fetch('https://api.pixellab.ai/v1/characters', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PIXELLAB_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: item.id,
        description,
        n_directions: 8,
        size: item.size || 48,
        view: item.view || 'low top-down',
        outline: 'single color black outline',
        shading: 'basic shading',
        detail: 'medium detail',
        proportions: item.proportions || { type: 'preset', name: 'default' },
        ai_freedom: 750,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create character: ${response.statusText}`);
    }

    const data = await response.json();
    return data.character_id;
  }

  private async createTileset(item: any): Promise<string> {
    const response = await fetch('https://api.pixellab.ai/v1/tilesets/topdown', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PIXELLAB_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lower_description: item.lower,
        upper_description: item.upper,
        transition_description: item.transition,
        transition_size: 0.5,
        tile_size: { width: 16, height: 16 },
        view: 'high top-down',
        outline: 'lineless',
        shading: 'basic shading',
        detail: 'medium detail',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create tileset: ${response.statusText}`);
    }

    const data = await response.json();
    return data.tileset_id;
  }

  private async createIsometric(item: any): Promise<string> {
    const response = await fetch('https://api.pixellab.ai/v1/tiles/isometric', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PIXELLAB_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: item.desc || item.description,
        size: 32,
        tile_shape: item.tile_shape || 'block',
        outline: 'single color outline',
        shading: 'basic shading',
        detail: 'medium detail',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create isometric tile: ${response.statusText}`);
    }

    const data = await response.json();
    return data.tile_id;
  }

  private async checkJobStatus(jobId: string, type: string): Promise<{ status: string; eta?: number }> {
    let endpoint = '';
    if (type === 'character') endpoint = `/v1/characters/${jobId}`;
    else if (type === 'tileset') endpoint = `/v1/tilesets/${jobId}`;
    else if (type === 'isometric') endpoint = `/v1/tiles/isometric/${jobId}`;

    const response = await fetch(`https://api.pixellab.ai${endpoint}`, {
      headers: { 'Authorization': `Bearer ${PIXELLAB_API_KEY}` },
    });

    if (!response.ok) return { status: 'failed' };

    const data = await response.json();
    return {
      status: data.status,
      eta: data.eta_seconds,
    };
  }

  private async processItem(item: any, category: string, type: string): Promise<void> {
    if (this.completedIds.has(item.id) || this.failedIds.has(item.id)) {
      return; // Skip already processed
    }

    if (this.activeJobs.has(item.id)) {
      return; // Already in progress
    }

    try {
      let jobId: string;

      console.log(`🚀 Starting: ${item.id} (${type})`);

      if (type === 'character') {
        jobId = await this.createCharacter(item, category);
      } else if (type === 'tileset') {
        jobId = await this.createTileset(item);
      } else if (type === 'isometric') {
        jobId = await this.createIsometric(item);
      } else {
        return;
      }

      this.activeJobs.set(item.id, {
        itemId: item.id,
        itemType: type,
        jobId,
        startTime: Date.now(),
      });

      console.log(`  → Job ID: ${jobId}`);

    } catch (error) {
      console.error(`❌ Failed to start ${item.id}:`, error);
      this.failedIds.add(item.id);
    }
  }

  private async checkActiveJobs(): Promise<void> {
    const completed: string[] = [];

    for (const [itemId, job] of this.activeJobs.entries()) {
      try {
        const { status, eta } = await this.checkJobStatus(job.jobId, job.itemType);

        if (status === 'completed') {
          const duration = ((Date.now() - job.startTime) / 1000).toFixed(0);
          console.log(`✅ Completed: ${itemId} (${duration}s)`);
          completed.push(itemId);
          this.completedIds.add(itemId);
        } else if (status === 'failed') {
          console.log(`❌ Failed: ${itemId}`);
          completed.push(itemId);
          this.failedIds.add(itemId);
        } else if (eta) {
          const elapsed = ((Date.now() - job.startTime) / 1000).toFixed(0);
          console.log(`⏳ ${itemId}: ${status} (${elapsed}s elapsed, ${eta}s remaining)`);
        }
      } catch (error) {
        console.error(`Error checking ${itemId}:`, error);
      }
    }

    // Remove completed jobs
    for (const itemId of completed) {
      this.activeJobs.delete(itemId);
    }
  }

  private getAllPendingItems(): Array<{ item: any; category: string; type: string }> {
    const pending: Array<{ item: any; category: string; type: string }> = [];

    // Characters - humanoids
    for (const [race, data] of Object.entries(this.manifest.humanoids || {})) {
      if (race === 'description') continue;
      const raceData = data as any;
      for (const item of raceData.pending || []) {
        pending.push({ item, category: `humanoids/${race}`, type: 'character' });
      }
    }

    // Characters - animals
    for (const [category, data] of Object.entries(this.manifest.animals || {})) {
      if (category === 'description') continue;
      const catData = data as any;
      for (const item of catData.pending || []) {
        pending.push({ item, category: `animals/${category}`, type: 'character' });
      }
    }

    // Isometric tiles
    for (const [category, data] of Object.entries(this.manifest.building_tiles || {})) {
      if (category === 'description') continue;
      const catData = data as any;
      for (const item of catData.pending || []) {
        pending.push({ item, category: `building_tiles/${category}`, type: 'isometric' });
      }
    }

    // Tilesets
    for (const [category, data] of Object.entries(this.manifest.tilesets || {})) {
      if (category === 'description') continue;
      const catData = data as any;
      for (const item of catData.pending || []) {
        pending.push({ item, category: `tilesets/${category}`, type: 'tileset' });
      }
    }

    return pending;
  }

  async run(): Promise<void> {
    console.log('🎨 PixelLab Queue Worker Started\n');

    while (true) {
      // Check status of active jobs
      if (this.activeJobs.size > 0) {
        await this.checkActiveJobs();
      }

      // Get pending items
      const pendingItems = this.getAllPendingItems()
        .filter(({ item }) => !this.completedIds.has(item.id) && !this.failedIds.has(item.id));

      // Fill queue
      const slots = MAX_CONCURRENT - this.activeJobs.size;
      const itemsToStart = pendingItems.slice(0, slots);

      for (const { item, category, type } of itemsToStart) {
        await this.processItem(item, category, type);
        await new Promise(r => setTimeout(r, 1000)); // Rate limit: 1 per second
      }

      // Status
      console.log(`\n📊 Status: ${this.activeJobs.size} active, ${this.completedIds.size} completed, ${this.failedIds.size} failed, ${pendingItems.length} pending\n`);

      // Check if done
      if (this.activeJobs.size === 0 && pendingItems.length === 0) {
        console.log('✨ All items processed!');
        break;
      }

      // Wait before next poll
      await new Promise(r => setTimeout(r, POLL_INTERVAL));
    }
  }
}

new QueueWorker().run().catch(console.error);
