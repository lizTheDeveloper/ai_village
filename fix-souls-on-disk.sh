#!/bin/bash
# Fix corrupted souls in gzipped save files

set -e

SAVES_DIR="/Users/annhoward/src/ai_village/custom_game_engine/saves"

echo "🔍 Finding all save files..."

# Find all .json.gz files
find "$SAVES_DIR" -name "*.json.gz" -type f | while read -r gzfile; do
    echo ""
    echo "📦 Processing: $gzfile"

    # Decompress to temp file
    tempfile=$(mktemp).json
    gunzip -c "$gzfile" > "$tempfile"

    # Check if it has soul data
    if ! grep -q "soul_creation_event" "$tempfile"; then
        echo "   ⏭️  No souls in this save"
        rm "$tempfile"
        continue
    fi

    # Fix the souls using Node.js
    node -e "
        const fs = require('fs');
        const data = JSON.parse(fs.readFileSync('$tempfile', 'utf8'));

        let totalFixed = 0;
        let corruptedSouls = [];

        if (data.world && data.world.entities) {
            for (const entity of data.world.entities) {
                if (!entity.components || !entity.components.soul_creation_event) continue;

                const event = entity.components.soul_creation_event;
                const name = entity.components.soul_identity?.true_name || 'Unknown';
                let wasCorrupted = false;

                // Fix statements with <think> tags
                if (event.creationDebate && event.creationDebate.statements) {
                    for (const stmt of event.creationDebate.statements) {
                        if (stmt.statement && stmt.statement.includes('<think>')) {
                            stmt.statement = stmt.statement.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
                            wasCorrupted = true;
                            totalFixed++;
                        }
                    }
                }

                // Fix transcript thoughts
                if (event.conversationTranscript) {
                    for (const ex of event.conversationTranscript) {
                        if (ex.thoughts) {
                            delete ex.thoughts;
                            wasCorrupted = true;
                            totalFixed++;
                        }
                    }
                }

                if (wasCorrupted) {
                    corruptedSouls.push(name);

                    // Add corruption history
                    if (!entity.components.corruption_history) {
                        entity.components.corruption_history = { corruptions: [] };
                    }
                    entity.components.corruption_history.corruptions.push({
                        type: 'thinking_data_removed',
                        cleaned_at: Date.now(),
                        cleaner: 'disk_fix_script'
                    });
                }
            }
        }

        if (totalFixed > 0) {
            console.log('   ⚠️  ' + corruptedSouls.length + ' corrupted souls: ' + corruptedSouls.join(', '));
            console.log('   🔧 ' + totalFixed + ' fixes applied');
            fs.writeFileSync('$tempfile', JSON.stringify(data));
            process.exit(0);  // Modified
        } else {
            console.log('   ✅ Clean');
            process.exit(1);  // Not modified
        }
    "

    # If modified (exit code 0), recompress
    if [ $? -eq 0 ]; then
        gzip -c "$tempfile" > "$gzfile"
        echo "   ✅ Saved!"
    fi

    rm "$tempfile"
done

echo ""
echo "✅ Done fixing all save files!"
