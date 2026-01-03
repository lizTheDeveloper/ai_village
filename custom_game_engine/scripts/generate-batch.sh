#!/bin/bash

# Batch Paper Generator
# Usage: ./generate-batch.sh <spec-file.json> <output-file.ts>

set -e

SPEC_FILE=$1
OUTPUT_FILE=$2

if [ -z "$SPEC_FILE" ] || [ -z "$OUTPUT_FILE" ]; then
  echo "Usage: ./generate-batch.sh <spec-file.json> <output-file.ts>"
  echo ""
  echo "Example:"
  echo "  ./generate-batch.sh paper-specs/brewing-fermentation.json ../packages/world/src/research-papers/brewing-fermentation-papers.ts"
  exit 1
fi

# Check if .env exists
if [ ! -f "../.env" ]; then
  echo "Error: ../.env file not found. Please create it with ANTHROPIC_API_KEY="
  exit 1
fi

# Load API key from .env
set -a  # Mark variables for export
source ../.env
set +a  # Stop marking for export

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "Error: ANTHROPIC_API_KEY not found in .env"
  exit 1
fi

echo "Generating papers from $SPEC_FILE..."
echo "Output will be written to $OUTPUT_FILE"
echo ""

# Run the generator
npx tsx generate-research-paper.ts "$SPEC_FILE" "$OUTPUT_FILE"

echo ""
echo "Done! Generated papers written to $OUTPUT_FILE"
echo ""
echo "Next steps:"
echo "1. Review the generated papers"
echo "2. Add the papers to index.ts exports"
echo "3. Create the corresponding ResearchSet in research-sets.ts"
echo "4. Run 'npm run build' to verify"
