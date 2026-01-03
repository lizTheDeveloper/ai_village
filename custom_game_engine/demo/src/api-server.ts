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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
const envPath = path.join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images

// API routes
app.post('/api/generate-sprite', generateSprite);
app.post('/api/save-alien-species', saveAlienSpecies);
app.get('/api/alien-species', getAllAlienSpecies);

app.listen(PORT, () => {
  console.log(`🛸 Alien Generator API running on http://localhost:${PORT}`);
  console.log(`   - POST /api/generate-sprite - Generate PixelLab sprite`);
  console.log(`   - POST /api/save-alien-species - Save species with variants`);
  console.log(`   - GET /api/alien-species - Get all species`);
});
