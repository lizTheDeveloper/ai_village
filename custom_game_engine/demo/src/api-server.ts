#!/usr/bin/env tsx
/**
 * Alien Generator API Server
 * Runs on port 3001 to handle PixelLab API proxying and species persistence
 */

import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { generateSprite, saveAlienSpecies, getAllAlienSpecies } from './alien-api.js';
import { SoulRepositorySystem } from '../../packages/core/src/systems/SoulRepositorySystem.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
const envPath = path.join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images

// Initialize soul repository (server-side persistence)
const soulRepository = new SoulRepositorySystem();

// Soul repository endpoint
app.post('/api/save-soul', async (req, res) => {
  try {
    const soulData = req.body;
    console.log(`[API] Receiving soul: ${soulData.name} (${soulData.archetype})`);

    // Create a minimal world mock for the repository system
    const mockWorld = {
      tick: Date.now(),
      getEntity: (id: string) => {
        // Return a mock entity with the soul data
        return {
          id,
          components: new Map([
            ['soul_identity', {
              soulName: soulData.name,
              soulBirthTick: soulData.soulBirthTick || Date.now(),
            }]
          ])
        };
      }
    } as any;

    // Save soul to repository
    await (soulRepository as any).backupSoul(mockWorld, soulData);

    res.json({ success: true, message: `Soul ${soulData.name} saved to repository` });
  } catch (error: any) {
    console.error('[API] Error saving soul:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get repository stats
app.get('/api/soul-repository/stats', (req, res) => {
  try {
    const stats = soulRepository.getStats();
    res.json(stats);
  } catch (error: any) {
    console.error('[API] Error getting repository stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// API routes
app.post('/api/generate-sprite', generateSprite);
app.post('/api/save-alien-species', saveAlienSpecies);
app.get('/api/alien-species', getAllAlienSpecies);

app.listen(PORT, () => {
});
