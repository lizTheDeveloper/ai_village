/**
 * Update existing souls with varying incarnation counts for testing sprite evolution
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOUL_REPO_DIR = path.join(__dirname, '../demo/soul-repository/by-date/2026-01-04');
const INDEX_FILE = path.join(__dirname, '../demo/soul-repository/index.json');

// Target incarnation counts for testing all sprite evolution tiers
const TARGET_COUNTS = [
  1,   // First incarnation (1 direction)
  2,   // Second incarnation (4 directions)
  3,   // Third incarnation (8 directions)
  5,   // Mid-range (8 directions)
  10,  // Walking animation unlocks
  12,  // Some walking directions
  15,  // More walking directions
  20,  // Full walking animations
  25,  // Idle animations start
  30,  // Combat animations
  50,  // Legendary soul
  100, // Ancient soul
];

interface IncarnationRecord {
  incarnationTick: number;
  deathTick?: number;
  bodyName?: string;
  bodySpecies?: string;
  duration?: number;
  notableEvents?: string[];
  causeOfDeath?: string;
}

function createIncarnationHistory(count: number, soulName: string): IncarnationRecord[] {
  const history: IncarnationRecord[] = [];
  let currentTick = 1000;

  for (let i = 0; i < count; i++) {
    const incarnationTick = currentTick;
    const lifetime = Math.floor(Math.random() * 50000) + 10000; // 10k-60k ticks
    const deathTick = incarnationTick + lifetime;

    history.push({
      incarnationTick,
      deathTick,
      bodyName: `${soulName} (Life ${i + 1})`,
      bodySpecies: 'human',
      duration: lifetime,
      causeOfDeath: i < count - 1 ? 'old age' : undefined, // Last incarnation is still alive
      notableEvents: [],
    });

    currentTick = deathTick + Math.floor(Math.random() * 5000); // Gap between lives
  }

  // Remove deathTick from last incarnation (current life)
  if (history.length > 0) {
    delete history[history.length - 1].deathTick;
    delete history[history.length - 1].duration;
    delete history[history.length - 1].causeOfDeath;
  }

  return history;
}

async function updateSouls() {
  // Read all soul files
  const files = fs.readdirSync(SOUL_REPO_DIR).filter(f => f.endsWith('.json'));

  console.log(`Found ${files.length} souls in repository`);

  // Limit to the number of target counts we have
  const filesToUpdate = files.slice(0, TARGET_COUNTS.length);

  for (let i = 0; i < filesToUpdate.length; i++) {
    const file = filesToUpdate[i];
    const filePath = path.join(SOUL_REPO_DIR, file);
    const targetCount = TARGET_COUNTS[i];

    const soulData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Create incarnation history
    const incarnationHistory = createIncarnationHistory(targetCount, soulData.name || 'Unknown');

    // Update soul data
    soulData.incarnationHistory = incarnationHistory;
    soulData.isReincarnated = targetCount > 1;

    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(soulData, null, 2));

    console.log(
      `✓ Updated ${soulData.name || 'Unknown'}: ${targetCount} incarnation${targetCount === 1 ? '' : 's'}`
    );
  }

  // Update index.json
  const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
  index.lastUpdated = new Date().toISOString();

  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));

  console.log(`\n✓ Updated ${filesToUpdate.length} souls with varying incarnation counts`);
  console.log(`  Counts: ${TARGET_COUNTS.slice(0, filesToUpdate.length).join(', ')}`);
}

updateSouls().catch(console.error);
