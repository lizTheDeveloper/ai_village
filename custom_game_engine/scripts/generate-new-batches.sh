#!/bin/bash

# Generate the new batches created after the initial run

set -e

cd "$(dirname "$0")"

echo "Generating NEW batches (14 batches, ~59 papers)"
echo "=============================================="
echo ""

# List of new batches
NEW_BATCHES=(
  "blood-magic-contracts"
  "blood-magic-healing"
  "necromancy-souls"
  "necromancy-animation"
  "fire-magic-combustion"
  "basic-tools"
  "lever-mechanics"
  "pottery-comprehensive"
  "illusion-magic"
  "mathematics-advanced"
  "starting-technologies"
  "basic-farming"
  "basic-clothing"
  "food-gathering"
)

for batch in "${NEW_BATCHES[@]}"; do
  echo "=== Starting batch: $batch ==="
  ./generate-batch.sh "paper-specs/${batch}.json" "../packages/world/src/research-papers/${batch}-papers.ts" || echo "FAILED: $batch"
  echo ""
done

echo "=============================================="
echo "All new batches complete!"
echo ""
echo "Next steps:"
echo "1. Review generated papers"
echo "2. Add exports to index.ts"
echo "3. Create ResearchSets"
echo "4. Run 'npm run build'"
