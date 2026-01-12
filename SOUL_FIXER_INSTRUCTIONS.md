# Fix Corrupted Souls - Instructions

## Problem

Some souls have `<think>` tags left in their creation debate statements or `thoughts` fields in their conversation transcript. This happened during the soul creation ceremony when LLM thinking data wasn't properly stripped.

## Quick Fix (Browser Console)

### Step 1: Load a game with souls

1. Open http://localhost:3000/game.html
2. Load an existing save that has souls in it, OR
3. Start a new game and let some souls be created

### Step 2: Open browser console

Press F12 to open DevTools, then go to the **Console** tab

### Step 3: Copy and paste this entire script:

```javascript
// === SOUL CORRUPTION FIXER ===
(function() {
  async function findAndFixAllCorruptedSouls() {
    console.log('🔍 Searching for corrupted souls in ALL saves...\n');

    // Access IndexedDB through the save service
    const { IndexedDBStorage } = await import('/src/persistence/storage/IndexedDBStorage.js');
    const storage = new IndexedDBStorage();

    const saves = await storage.listSaves();
    console.log(`Found ${saves.length} saves\n`);

    let totalCorrupted = 0;
    let totalFixed = 0;

    for (const saveKey of saves) {
      console.log(`\n📦 Checking: ${saveKey}`);

      const saveData = await storage.load(saveKey);
      if (!saveData?.world?.entities) {
        console.log('   ⚠️  No entities\n');
        continue;
      }

      let fixedInSave = 0;
      const corruptedSouls = [];

      for (const entity of saveData.world.entities) {
        if (!entity.components?.soul_creation_event) continue;

        const event = entity.components.soul_creation_event;
        const trueName = entity.components?.soul_identity?.true_name || 'Unknown';
        let corrupted = false;

        // Fix statements
        if (event.creationDebate?.statements) {
          for (let i = 0; i < event.creationDebate.statements.length; i++) {
            const stmt = event.creationDebate.statements[i];
            if (stmt.statement && stmt.statement.includes('<think>')) {
              stmt.statement = stmt.statement.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
              corrupted = true;
              fixedInSave++;
            }
          }
        }

        // Fix transcript
        if (event.conversationTranscript) {
          for (const exchange of event.conversationTranscript) {
            if (exchange.thoughts) {
              delete exchange.thoughts;
              corrupted = true;
              fixedInSave++;
            }
          }
        }

        if (corrupted) {
          corruptedSouls.push(trueName);
          totalCorrupted++;

          // Add corruption history
          if (!entity.components.corruption_history) {
            entity.components.corruption_history = { corruptions: [] };
          }
          entity.components.corruption_history.corruptions.push({
            type: 'thinking_data_removed',
            cleaned_at: Date.now(),
            cleaner: 'soul_fixer_script'
          });
        }
      }

      if (fixedInSave > 0) {
        console.log(`   ⚠️  Found ${corruptedSouls.length} corrupted souls: ${corruptedSouls.join(', ')}`);
        console.log(`   🔧 Applied ${fixedInSave} fixes`);

        // Save back
        await storage.save(saveKey, saveData, { name: saveKey });
        console.log(`   ✅ Saved!`);
        totalFixed += fixedInSave;
      } else {
        console.log(`   ✅ Clean`);
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📊 FINAL REPORT');
    console.log('═'.repeat(60));
    console.log(`Corrupted souls found: ${totalCorrupted}`);
    console.log(`Total fixes applied: ${totalFixed}`);
    console.log('═'.repeat(60) + '\n');

    if (totalFixed > 0) {
      console.log('✅ All corrupted souls have been fixed and saved!\n');
    } else {
      console.log('✅ No corrupted souls found!\n');
    }
  }

  // Run it
  window.findAndFixAllCorruptedSouls = findAndFixAllCorruptedSouls;
  console.log('📜 Soul fixer loaded! Run: findAndFixAllCorruptedSouls()');
})();
```

### Step 4: Run the fixer

```javascript
findAndFixAllCorruptedSouls()
```

This will:
- ✅ Scan ALL saves in IndexedDB
- ✅ Find souls with `<think>` tags or `thoughts` fields
- ✅ Remove the corrupted thinking data
- ✅ Add a `corruption_history` component (Conservation of Game Matter)
- ✅ Save the fixed versions back to IndexedDB

## Manual Fix (If Needed)

If the automatic fix doesn't work, use the manual browser console commands from `find-and-fix-souls.js`.

## What Gets Fixed

1. **Debate Statements**: Removes `<think>...</think>` tags from Fate statements
2. **Conversation Transcript**: Deletes `thoughts` fields from conversation exchanges

## Conservation of Game Matter

The souls are **never deleted**. Instead, they get a `corruption_history` component documenting the cleanup, so you have a permanent record of what was fixed.
