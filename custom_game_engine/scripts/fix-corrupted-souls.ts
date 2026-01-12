/**
 * Find and Fix Corrupted Souls - Direct IndexedDB Access
 *
 * This script reads IndexedDB save files and fixes souls with <think> tags
 */

import { openDB } from 'idb';

interface SoulCreationStatement {
  fate: string;
  statement: string;
  aspect?: string;
  tick?: number;
}

interface ConversationExchange {
  speaker: string;
  text: string;
  thoughts?: string;
  tick: number;
  topic?: string;
}

interface SoulCreationEvent {
  creationDebate?: {
    statements: SoulCreationStatement[];
  };
  conversationTranscript?: ConversationExchange[];
}

async function findAndFixCorruptedSouls() {
  console.log('🔍 Opening IndexedDB...\n');

  // Open the IndexedDB database
  const db = await openDB('ai-village-saves', 1);

  // Get all saves
  const tx = db.transaction('saves', 'readonly');
  const store = tx.objectStore('saves');
  const allSaves = await store.getAll();

  console.log(`Found ${allSaves.length} save files\n`);

  let totalCorrupted = 0;
  let totalFixed = 0;

  for (const save of allSaves) {
    console.log(`\n📦 Checking save: ${save.key || save.metadata?.name || 'Unnamed'}`);
    console.log(`   Created: ${save.metadata?.created ? new Date(save.metadata.created).toLocaleString() : 'Unknown'}`);

    if (!save.data?.world?.entities) {
      console.log('   ⚠️  No entities in save\n');
      continue;
    }

    const entities = save.data.world.entities;
    const corruptedInSave: string[] = [];

    // Check each entity
    for (const entity of entities) {
      if (!entity.components?.soul_creation_event) {
        continue;
      }

      const event: SoulCreationEvent = entity.components.soul_creation_event;
      const trueName = entity.components?.soul_identity?.true_name || 'Unknown';
      let hasCorruption = false;

      // Check statements for <think> tags
      if (event.creationDebate?.statements) {
        for (const stmt of event.creationDebate.statements) {
          if (stmt.statement && stmt.statement.includes('<think>')) {
            hasCorruption = true;
            corruptedInSave.push(`${trueName} (${entity.id.substring(0, 8)}): <think> tag in statement`);

            // FIX: Remove <think> tags
            stmt.statement = stmt.statement
              .replace(/<think>[\s\S]*?<\/think>/gi, '')
              .trim();
            totalFixed++;
          }
        }
      }

      // Check transcript for thoughts field
      if (event.conversationTranscript) {
        for (const exchange of event.conversationTranscript) {
          if (exchange.thoughts && exchange.thoughts.trim().length > 0) {
            hasCorruption = true;
            corruptedInSave.push(`${trueName} (${entity.id.substring(0, 8)}): thoughts field in transcript`);

            // FIX: Remove thoughts field
            delete exchange.thoughts;
            totalFixed++;
          }
        }
      }

      if (hasCorruption) {
        totalCorrupted++;

        // Add corruption history (Conservation of Game Matter)
        if (!entity.components.corruption_history) {
          entity.components.corruption_history = { corruptions: [] };
        }
        entity.components.corruption_history.corruptions.push({
          type: 'thinking_data_removed',
          cleaned_at: Date.now(),
          cleaner: 'fix-corrupted-souls-script'
        });
      }
    }

    if (corruptedInSave.length > 0) {
      console.log(`   ⚠️  Found ${corruptedInSave.length} corruption points:`);
      for (const corruption of corruptedInSave) {
        console.log(`      - ${corruption}`);
      }

      // Save the fixed version back to IndexedDB
      const writeTx = db.transaction('saves', 'readwrite');
      const writeStore = writeTx.objectStore('saves');
      await writeStore.put(save);
      await writeTx.done;

      console.log(`   ✅ Fixed and saved!`);
    } else {
      console.log(`   ✅ Clean - no corrupted souls`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Total corrupted souls: ${totalCorrupted}`);
  console.log(`Total fixes applied: ${totalFixed}`);
  console.log('═'.repeat(60) + '\n');

  db.close();
}

// Run it
findAndFixCorruptedSouls().catch(console.error);
