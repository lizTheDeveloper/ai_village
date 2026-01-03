#!/bin/bash

# Generate all herbalism, cooking, and construction papers from spec files

set -e

cd "$(dirname "$0")"

echo "Generating ALL Herbalism, Cooking, and Construction Papers"
echo "==========================================================="
echo "Total: 345 papers across 39 batches"
echo "Estimated time: ~30-60 minutes"
echo ""

# Find all newly created spec files
SPEC_FILES=($(ls paper-specs/herbal_cultivation-*.json \
                paper-specs/medicinal_herbalism-*.json \
                paper-specs/advanced_herbal_preparations-*.json \
                paper-specs/magical_herbalism-*.json \
                paper-specs/cooking_fundamentals-*.json \
                paper-specs/advanced_cooking_techniques-*.json \
                paper-specs/food_preservation-*.json \
                paper-specs/culinary_arts_gastronomy-*.json \
                paper-specs/brewing_beverages-*.json \
                paper-specs/basic_construction_materials-*.json \
                paper-specs/carpentry_woodworking-*.json \
                paper-specs/masonry_stonework-*.json \
                paper-specs/advanced_construction_techniques-*.json \
                paper-specs/architectural_design-*.json \
                paper-specs/structural_engineering-*.json \
                paper-specs/magical_construction-*.json \
                paper-specs/monumental_architecture-*.json \
                paper-specs/underground_construction-*.json 2>/dev/null))

TOTAL=${#SPEC_FILES[@]}
CURRENT=0

for spec in "${SPEC_FILES[@]}"; do
  CURRENT=$((CURRENT + 1))
  BASENAME=$(basename "$spec" .json)
  OUTPUT="../packages/world/src/research-papers/${BASENAME}-papers.ts"

  echo "[$CURRENT/$TOTAL] Processing: $BASENAME"
  ./generate-batch.sh "$spec" "$OUTPUT" || echo "FAILED: $BASENAME"
  echo ""
done

echo "==========================================================="
echo "Generation complete!"
echo ""
echo "Generated papers for:"
echo "  - Herbalism (cultivation, medicinal, advanced, magical)"
echo "  - Cooking (fundamentals, advanced, preservation, gastronomy)"
echo "  - Brewing (beverages)"
echo "  - Construction (materials, carpentry, masonry, advanced)"
echo "  - Architecture (design, structural, magical, monumental, underground)"
echo ""
echo "Next steps:"
echo "1. Review generated papers in packages/world/src/research-papers/"
echo "2. Papers are already integrated with existing research sets"
echo "3. Run 'npm run build' to verify"
echo ""
