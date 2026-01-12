/**
 * Fix corrupted souls in IndexedDB
 * Run with: npx tsx scripts/fix-indexeddb-souls.ts
 */

import puppeteer from 'puppeteer';

async function fixSoulsInIndexedDB() {
  console.log('🚀 Launching browser to access IndexedDB...\n');

  const browser = await puppeteer.launch({
    headless: false,  // Show browser so you can see it working
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();

  // Navigate to the game (IndexedDB is domain-specific)
  console.log('📡 Navigating to http://localhost:3000...\n');
  await page.goto('http://localhost:3000/game.html', { waitUntil: 'networkidle0' });

  // Wait a bit for page to load
  await page.waitForTimeout(2000);

  console.log('🔍 Accessing IndexedDB and fixing souls...\n');

  const result = await page.evaluate(async () => {
    return new Promise((resolve) => {
      const dbRequest = indexedDB.open('ai-village-saves', 1);

      dbRequest.onerror = () => {
        resolve({ error: 'Failed to open IndexedDB' });
      };

      dbRequest.onsuccess = async (event: any) => {
        const db = event.target.result;
        const tx = db.transaction('saves', 'readwrite');
        const store = tx.objectStore('saves');
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = async () => {
          const saves = getAllRequest.result;
          const results = {
            totalSaves: saves.length,
            totalCorrupted: 0,
            totalFixed: 0,
            details: [] as any[]
          };

          for (const save of saves) {
            const key = save.key || save.metadata?.name || 'unknown';
            const saveResult = {
              key,
              corrupted: 0,
              fixed: 0,
              souls: [] as string[]
            };

            if (!save.data?.world?.entities) {
              results.details.push(saveResult);
              continue;
            }

            for (const entity of save.data.world.entities) {
              if (!entity.components?.soul_creation_event) continue;

              const event = entity.components.soul_creation_event;
              const name = entity.components?.soul_identity?.true_name || 'Unknown';
              let wasCorrupted = false;

              // Fix statements
              if (event.creationDebate?.statements) {
                for (const stmt of event.creationDebate.statements) {
                  if (stmt.statement?.includes('<think>')) {
                    stmt.statement = stmt.statement.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
                    wasCorrupted = true;
                    saveResult.fixed++;
                  }
                }
              }

              // Fix transcript
              if (event.conversationTranscript) {
                for (const ex of event.conversationTranscript) {
                  if (ex.thoughts) {
                    delete ex.thoughts;
                    wasCorrupted = true;
                    saveResult.fixed++;
                  }
                }
              }

              if (wasCorrupted) {
                saveResult.corrupted++;
                saveResult.souls.push(name);

                // Add corruption history
                if (!entity.components.corruption_history) {
                  entity.components.corruption_history = { corruptions: [] };
                }
                entity.components.corruption_history.corruptions.push({
                  type: 'thinking_data_removed',
                  cleaned_at: Date.now(),
                  cleaner: 'indexeddb_fix_script'
                });
              }
            }

            if (saveResult.fixed > 0) {
              // Save back to IndexedDB
              await new Promise<void>((res) => {
                const putRequest = store.put(save);
                putRequest.onsuccess = () => res();
                putRequest.onerror = () => res();
              });
              results.totalCorrupted += saveResult.corrupted;
              results.totalFixed += saveResult.fixed;
            }

            results.details.push(saveResult);
          }

          db.close();
          resolve(results);
        };

        getAllRequest.onerror = () => {
          db.close();
          resolve({ error: 'Failed to read saves' });
        };
      };
    });
  });

  console.log('═'.repeat(60));
  console.log('📊 RESULTS');
  console.log('═'.repeat(60));

  if ('error' in result) {
    console.log('❌ Error:', result.error);
  } else {
    console.log(`Total saves checked: ${result.totalSaves}`);
    console.log(`Corrupted souls found: ${result.totalCorrupted}`);
    console.log(`Fixes applied: ${result.totalFixed}\n`);

    for (const detail of result.details) {
      if (detail.fixed > 0) {
        console.log(`\n📦 ${detail.key}`);
        console.log(`   Corrupted souls: ${detail.corrupted}`);
        console.log(`   Fixes applied: ${detail.fixed}`);
        console.log(`   Names: ${detail.souls.join(', ')}`);
      }
    }

    console.log('\n' + '═'.repeat(60));
    if (result.totalFixed > 0) {
      console.log('✅ All corrupted souls have been fixed!');
    } else {
      console.log('✅ No corrupted souls found!');
    }
    console.log('═'.repeat(60));
  }

  await browser.close();
}

fixSoulsInIndexedDB().catch(console.error);
