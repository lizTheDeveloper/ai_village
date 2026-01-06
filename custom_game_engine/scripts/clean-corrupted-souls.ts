/**
 * Clean up corrupted soul files that have thinking tags or JSON in their purpose field
 */

import * as fs from 'fs';
import * as path from 'path';

interface SoulRecord {
  soulId: string;
  agentId: string;
  name: string;
  species: string;
  archetype: string;
  purpose: string;
  interests: string[];
  thoughts?: string; // Fate reasoning (preserved for transparency/debugging)
  createdAt: string;
  soulBirthTick: number;
  universeId: string;
  version: number;
}

function cleanPurpose(purpose: string): { purpose: string; thoughts?: string } {
  const original = purpose;
  let cleaned = purpose.trim();
  let extractedThoughts: string | undefined;

  // Case 1: JSON with "speaking" and "thinking" fields
  const jsonMatch = cleaned.match(/\{[\s\S]*"speaking":\s*"([^"]+)"[\s\S]*\}/);
  if (jsonMatch) {
    console.log('  → Found JSON with speaking field');
    const jsonThinkingMatch = cleaned.match(/"thinking":\s*"([^"]+)"/);
    if (jsonThinkingMatch) {
      extractedThoughts = jsonThinkingMatch[1];
      console.log('  → Also extracted thinking from JSON');
    }
    return { purpose: jsonMatch[1], thoughts: extractedThoughts };
  }

  // Case 2: Extract <thinking> tags
  if (cleaned.includes('<thinking>') || cleaned.includes('</thinking>')) {
    console.log('  → Found <thinking> tags');
    const thinkingMatch = cleaned.match(/<thinking>([\s\S]*?)<\/thinking>/i);
    if (thinkingMatch) {
      extractedThoughts = thinkingMatch[1].trim();
    }
    cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
  }

  // Case 3: Extract <think> tags - but the tag might be unclosed!
  if (cleaned.includes('<think>')) {
    console.log('  → Found <think> tag');
    // Try to extract closed tags first
    const thinkMatch = cleaned.match(/<think>([\s\S]*?)<\/think>/i);
    if (thinkMatch && !extractedThoughts) {
      extractedThoughts = thinkMatch[1].trim();
    }
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // If still has <think>, it might be unclosed - extract and remove everything from <think> onward
    if (cleaned.includes('<think>')) {
      console.log('  → Unclosed <think> tag detected, extracting and removing from tag onward');
      const thinkIndex = cleaned.indexOf('<think>');
      if (!extractedThoughts) {
        extractedThoughts = cleaned.substring(thinkIndex + 7).trim(); // Skip "<think>"
      }
      cleaned = cleaned.substring(0, thinkIndex).trim();
    }
  }

  // Case 4: If it starts with JSON but no "speaking" field
  if (cleaned.startsWith('{') && cleaned.includes('"thinking"')) {
    console.log('  → Found JSON with only thinking field - extracting...');
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.thinking && !extractedThoughts) {
        extractedThoughts = parsed.thinking;
      }
      if (parsed.speaking) {
        return { purpose: parsed.speaking, thoughts: extractedThoughts };
      }
    } catch (e) {
      // Not valid JSON, leave as is
    }
  }

  // If we got nothing after cleaning, the soul is completely corrupted
  if (cleaned.length === 0 && original.length > 0) {
    console.log('  → WARNING: Soul completely corrupted - only thinking, no divine speech');
    // But preserve the thinking content!
    if (!extractedThoughts) {
      extractedThoughts = original;
    }
    return {
      purpose: '[CORRUPTED SOUL] The Fates spoke only in riddles and internal musings. This soul\'s purpose remains veiled in cosmic static. Perhaps a divine intervention could restore their true purpose...',
      thoughts: extractedThoughts,
    };
  }

  return { purpose: cleaned, thoughts: extractedThoughts };
}

function cleanSoulFile(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const soul: SoulRecord = JSON.parse(content);

    const originalPurpose = soul.purpose;
    const result = cleanPurpose(soul.purpose);

    const hasChanges = originalPurpose !== result.purpose || result.thoughts;

    if (hasChanges) {
      console.log(`\n${soul.name} (${soul.soulId})`);
      console.log(`  Original length: ${originalPurpose.length} chars`);
      console.log(`  Cleaned length:  ${result.purpose.length} chars`);
      console.log(`  Cleaned: "${result.purpose.substring(0, 100)}..."`);
      if (result.thoughts) {
        console.log(`  Thoughts extracted: ${result.thoughts.length} chars`);
      }

      soul.purpose = result.purpose;
      if (result.thoughts) {
        soul.thoughts = result.thoughts;
      }

      // Write back to all three locations
      const baseDir = path.dirname(filePath);
      const repoRoot = path.join(baseDir, '..', '..');

      // Update by-date
      const datePath = path.join(repoRoot, 'by-date', path.basename(path.dirname(filePath)), `${soul.soulId}.json`);
      fs.writeFileSync(datePath, JSON.stringify(soul, null, 2), 'utf-8');

      // Update by-species
      const speciesPath = path.join(repoRoot, 'by-species', soul.species, `${soul.soulId}.json`);
      if (fs.existsSync(speciesPath)) {
        fs.writeFileSync(speciesPath, JSON.stringify(soul, null, 2), 'utf-8');
      }

      // Update by-universe
      const universePath = path.join(repoRoot, 'by-universe', soul.universeId, `${soul.soulId}.json`);
      if (fs.existsSync(universePath)) {
        fs.writeFileSync(universePath, JSON.stringify(soul, null, 2), 'utf-8');
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

function main() {
  // Handle both running from repo root and from custom_game_engine dir
  const cwdParts = process.cwd().split(path.sep);
  const isInCustomGameEngine = cwdParts[cwdParts.length - 1] === 'custom_game_engine';
  const repoDir = isInCustomGameEngine
    ? path.join(process.cwd(), 'demo', 'soul-repository', 'by-date')
    : path.join(process.cwd(), 'custom_game_engine', 'demo', 'soul-repository', 'by-date');

  if (!fs.existsSync(repoDir)) {
    console.error('Soul repository not found:', repoDir);
    process.exit(1);
  }

  console.log('Cleaning corrupted soul files...\n');

  let totalCleaned = 0;
  let totalProcessed = 0;

  // Process all date directories
  const dates = fs.readdirSync(repoDir);
  for (const date of dates) {
    const dateDir = path.join(repoDir, date);
    if (!fs.statSync(dateDir).isDirectory()) continue;

    const files = fs.readdirSync(dateDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      totalProcessed++;
      const filePath = path.join(dateDir, file);
      if (cleanSoulFile(filePath)) {
        totalCleaned++;
      }
    }
  }

  console.log(`\n\nProcessed: ${totalProcessed} souls`);
  console.log(`Cleaned:   ${totalCleaned} souls`);
}

main();
