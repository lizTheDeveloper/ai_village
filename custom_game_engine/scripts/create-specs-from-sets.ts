#!/usr/bin/env tsx
/**
 * Create paper spec files from research sets
 * Extracts all paper IDs from research sets and generates spec JSON files
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the research sets
import { HERBALISM_COOKING_RESEARCH_SETS } from '../packages/world/src/research-papers/herbalism-cooking-sets.js';
import { CONSTRUCTION_BUILDING_RESEARCH_SETS } from '../packages/world/src/research-papers/construction-building-sets.js';

interface PaperSpec {
  paperId: string;
  title: string;
  field: string;
  paperSets: string[];
  prerequisitePapers: string[];
  complexity: number;
  minimumAge: 'teen' | 'adult' | 'elder';
  skillGrants: Record<string, number>;
  contributesTo: Array<{
    type: 'recipe' | 'building' | 'crop' | 'item' | 'ability' | 'spell' | 'herb';
    id: string;
  }>;
  topicDescription: string;
  keyPoints: string[];
}

function paperIdToTitle(paperId: string): string {
  return paperId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function generateTopicDescription(paperId: string, field: string): string {
  const title = paperIdToTitle(paperId);
  return `Understanding ${title.toLowerCase()} in the context of ${field}`;
}

function generateKeyPoints(paperId: string): string[] {
  const words = paperId.split('_');
  return [
    `Basic principles of ${words.join(' ')}`,
    `Practical applications and techniques`,
    `Safety considerations and best practices`,
    `Historical development and modern understanding`
  ];
}

function determineComplexity(setId: string, paperIndex: number, totalPapers: number): number {
  // Earlier papers in a set are simpler
  const progress = paperIndex / totalPapers;
  const baseComplexity = Math.ceil(progress * 8) + 1;
  return Math.min(10, Math.max(1, baseComplexity));
}

function determineMinimumAge(complexity: number): 'teen' | 'adult' | 'elder' {
  if (complexity <= 3) return 'teen';
  if (complexity <= 7) return 'adult';
  return 'elder';
}

function generateSkillGrants(field: string): Record<string, number> {
  const grants: Record<string, number> = {};

  // Primary skill based on field
  const fieldToSkill: Record<string, string> = {
    nature: 'herbalism',
    alchemy: 'alchemy',
    cuisine: 'cooking',
    construction: 'construction',
    engineering: 'engineering',
    arcane: 'magic'
  };

  const primarySkill = fieldToSkill[field] || field;
  grants[primarySkill] = 10;

  // Secondary skill
  if (field === 'alchemy') grants.herbalism = 5;
  if (field === 'cuisine') grants.nature = 3;
  if (field === 'engineering') grants.construction = 5;
  if (field === 'arcane') grants.construction = 3;

  return grants;
}

// Process all research sets
const allSets = [...HERBALISM_COOKING_RESEARCH_SETS, ...CONSTRUCTION_BUILDING_RESEARCH_SETS];

const specsBySet: Record<string, PaperSpec[]> = {};

for (const set of allSets) {
  const specs: PaperSpec[] = [];

  for (let i = 0; i < set.allPapers.length; i++) {
    const paperId = set.allPapers[i]!;
    const complexity = determineComplexity(set.setId, i, set.allPapers.length);

    const spec: PaperSpec = {
      paperId,
      title: paperIdToTitle(paperId),
      field: set.field,
      paperSets: [set.setId],
      prerequisitePapers: i > 0 ? [set.allPapers[i - 1]!] : [],
      complexity,
      minimumAge: determineMinimumAge(complexity),
      skillGrants: generateSkillGrants(set.field),
      contributesTo: [
        {
          type: 'ability',
          id: `learn_${paperId}`
        }
      ],
      topicDescription: generateTopicDescription(paperId, set.field),
      keyPoints: generateKeyPoints(paperId)
    };

    specs.push(spec);
  }

  specsBySet[set.setId] = specs;
}

// Write spec files (batch of 10 papers per file for manageable generation)
const outputDir = path.join(__dirname, 'paper-specs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

let totalPapers = 0;
const batchSize = 10;

for (const [setId, specs] of Object.entries(specsBySet)) {
  // Split into batches of 10
  for (let i = 0; i < specs.length; i += batchSize) {
    const batch = specs.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const fileName = `${setId}-batch${batchNum}.json`;
    const filePath = path.join(outputDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(batch, null, 2));
    console.log(`Created ${fileName} (${batch.length} papers)`);
    totalPapers += batch.length;
  }
}

console.log(`\nTotal spec files created for ${totalPapers} papers`);
console.log(`\nNext step: Run generation script on each spec file`);
