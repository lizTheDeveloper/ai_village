#!/bin/bash

# Generate herbalism, cooking, and construction research papers

set -e

cd "$(dirname "$0")"

echo "Generating Herbalism, Cooking, and Construction Papers"
echo "========================================================"
echo ""

# List of batches to generate
BATCHES=(
  "herbalism-medicinal"
  "cooking-advanced"
  "brewing-fermentation"
  "construction-masonry"
)

for batch in "${BATCHES[@]}"; do
  echo "=== Starting batch: $batch ==="
  ./generate-batch.sh "paper-specs/${batch}.json" "../packages/world/src/research-papers/${batch}-papers.ts" || echo "FAILED: $batch"
  echo ""
done

echo "========================================================"
echo "All herbalism/cooking/construction batches complete!"
echo ""
echo "Generated papers for:"
echo "  - Herbalism (medicinal)"
echo "  - Cooking (advanced techniques)"
echo "  - Brewing (fermentation)"
echo "  - Construction (masonry)"
echo ""
