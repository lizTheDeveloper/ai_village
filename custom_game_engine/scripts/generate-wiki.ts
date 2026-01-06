#!/usr/bin/env tsx
/**
 * Wiki Generator CLI
 *
 * Generates wiki documentation from embedded help entries in items and effects.
 *
 * Usage:
 *   npm run generate-wiki              # Generate all wikis
 *   npm run generate-wiki -- --format=md  # Markdown only
 *   npm run generate-wiki -- --format=json # JSON only
 *   npm run generate-wiki -- --category=items # Single category
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  helpRegistry,
  MarkdownWikiGenerator,
  JsonWikiGenerator,
} from '../packages/core/src/help/index.js';
import { getAllItems } from '../packages/core/src/data/ItemsLoader.js';
import { getAllSpells } from '../packages/core/src/data/SpellsLoader.js';

// Parse command line arguments
const args = process.argv.slice(2);
const format = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'both';
const category = args.find(arg => arg.startsWith('--category='))?.split('=')[1];

// Output directory
const WIKI_DIR = path.join(process.cwd(), 'wiki');

/**
 * Load all documented items and register their help entries
 */
function loadItemHelp() {
  console.log('Loading item documentation...');

  const items = getAllItems();
  let registered = 0;

  for (const item of items) {
    // Create a basic help entry for each item
    const helpEntry = {
      id: item.id,
      summary: item.description || `${item.displayName} - A ${item.category} item`,
      description: item.description || `${item.displayName} is a ${item.category} item.`,
      category: 'items',
      subcategory: item.category,
      tags: [item.category, ...(item.tags || [])],
      mechanics: {
        values: {
          weight: item.weight,
          stackSize: item.stackSize || 1,
          rarity: item.rarity || 'common',
        },
      },
    };

    helpRegistry.register(helpEntry);
    registered++;
  }

  console.log(`  Registered ${registered} items`);
}

/**
 * Load all documented effects and register their help entries
 */
function loadEffectHelp() {
  console.log('Loading spell documentation...');

  const spells = getAllSpells();
  let registered = 0;

  for (const spell of spells) {
    // Create a basic help entry for each spell
    const helpEntry = {
      id: spell.id,
      summary: spell.description || `${spell.name} - A ${spell.paradigm} spell`,
      description: spell.description || `${spell.name} is a ${spell.paradigm} paradigm spell.`,
      category: 'magic',
      subcategory: spell.paradigm,
      tags: [spell.paradigm, spell.tier || 'unknown', ...(spell.tags || [])],
      mechanics: {
        values: {
          tier: spell.tier || 'unknown',
          paradigm: spell.paradigm,
        },
      },
    };

    helpRegistry.register(helpEntry);
    registered++;
  }

  console.log(`  Registered ${registered} spells`);
}

/**
 * Generate markdown wiki
 */
function generateMarkdownWiki() {
  console.log('Generating Markdown wiki...');

  const mdDir = path.join(WIKI_DIR, 'markdown');
  if (!fs.existsSync(mdDir)) {
    fs.mkdirSync(mdDir, { recursive: true });
  }

  const generator = new MarkdownWikiGenerator(helpRegistry);
  const categories = category ? [category] : helpRegistry.getCategories();

  for (const cat of categories) {
    console.log(`  - ${cat}...`);
    const markdown = generator.generateCategory(cat, {
      includeToc: true,
      includeLore: true,
      includeMechanics: true,
      includeExamples: true,
      includeRelated: true,
    });

    const filename = path.join(mdDir, `${cat}.md`);
    fs.writeFileSync(filename, markdown, 'utf-8');
    console.log(`    Written: ${filename}`);
  }

  // Generate index
  const indexMd = generateMarkdownIndex(categories);
  const indexFilename = path.join(mdDir, 'README.md');
  fs.writeFileSync(indexFilename, indexMd, 'utf-8');
  console.log(`  Written index: ${indexFilename}`);
}

/**
 * Generate JSON wiki
 */
function generateJsonWiki() {
  console.log('Generating JSON wiki...');

  const jsonDir = path.join(WIKI_DIR, 'json');
  if (!fs.existsSync(jsonDir)) {
    fs.mkdirSync(jsonDir, { recursive: true });
  }

  const generator = new JsonWikiGenerator(helpRegistry);

  if (category) {
    const json = generator.generateCategory(category);
    const filename = path.join(jsonDir, `${category}.json`);
    fs.writeFileSync(filename, JSON.stringify(json, null, 2), 'utf-8');
    console.log(`  Written: ${filename}`);
  } else {
    const fullWiki = generator.generateFull();
    const filename = path.join(jsonDir, 'wiki.json');
    fs.writeFileSync(filename, JSON.stringify(fullWiki, null, 2), 'utf-8');
    console.log(`  Written: ${filename}`);
  }
}

/**
 * Generate markdown index page
 */
function generateMarkdownIndex(categories: string[]): string {
  const stats = helpRegistry.getStats();

  let md = `# Multiverse: The End of Eternity Game Wiki\n\n`;
  md += `Auto-generated documentation from embedded help entries.\n\n`;
  md += `**Total Entries:** ${stats.totalEntries}\n\n`;
  md += `**Last Updated:** ${new Date().toISOString()}\n\n`;
  md += `---\n\n`;
  md += `## Categories\n\n`;

  for (const cat of categories) {
    const count = stats.categories[cat] || 0;
    md += `- [${capitalize(cat)}](./${cat}.md) (${count} entries)\n`;
  }

  md += `\n---\n\n`;
  md += `## Tags\n\n`;

  const topTags = Object.entries(stats.tags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  for (const [tag, count] of topTags) {
    md += `- \`${tag}\` (${count})\n`;
  }

  return md;
}

/**
 * Print usage statistics
 */
function printStats() {
  const stats = helpRegistry.getStats();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Wiki Statistics');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Total Entries: ${stats.totalEntries}\n`);

  console.log('Categories:');
  for (const [cat, count] of Object.entries(stats.categories)) {
    console.log(`  ${cat.padEnd(15)} ${count} entries`);
  }

  console.log(`\nTotal Tags: ${Object.keys(stats.tags).length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// Main
// ============================================================================

console.log('🚀 Multiverse: The End of Eternity Wiki Generator\n');

// Load all help entries
loadItemHelp();
loadEffectHelp();

// Check if we have any entries
if (helpRegistry.getStats().totalEntries === 0) {
  console.log('⚠️  No help entries found. Make sure items/effects have help documentation.');
  console.log('   See packages/core/src/help/documentedItems.example.ts for examples.\n');
  process.exit(0);
}

// Generate wikis
try {
  if (format === 'md' || format === 'both') {
    generateMarkdownWiki();
  }

  if (format === 'json' || format === 'both') {
    generateJsonWiki();
  }

  printStats();

  console.log('✅ Wiki generation complete!\n');
  console.log(`   Markdown: ${path.join(WIKI_DIR, 'markdown')}`);
  console.log(`   JSON:     ${path.join(WIKI_DIR, 'json')}\n`);
} catch (error) {
  console.error('❌ Error generating wiki:', error);
  process.exit(1);
}
