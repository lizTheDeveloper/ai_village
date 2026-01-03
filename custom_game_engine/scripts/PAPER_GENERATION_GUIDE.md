# Research Paper Generation System

Automated generation of research papers using Anthropic API with Pratchett/Moers/Adams/Gaiman style.

## Setup

1. **API Key is already configured** in `../.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-...
   ```

2. **Install dependencies** (if not already):
   ```bash
   npm install @anthropic-ai/sdk
   ```

## Quick Start

Generate a batch of papers:

```bash
cd scripts
./generate-batch.sh paper-specs/brewing-fermentation.json ../packages/world/src/research-papers/brewing-fermentation-papers.ts
```

This will generate 6 papers about brewing fermentation with full Pratchett-style footnotes.

## Creating Spec Files

Create a JSON file in `scripts/paper-specs/` with an array of paper specifications:

```json
[
  {
    "paperId": "yeast_discovery",
    "title": "On the Discovery of Invisible Life",
    "field": "cuisine",
    "paperSets": ["brewing_fermentation"],
    "prerequisitePapers": [],
    "complexity": 3,
    "minimumAge": "teen",
    "skillGrants": { "brewing": 10, "nature": 5 },
    "contributesTo": [
      { "type": "recipe", "id": "simple_beer" }
    ],
    "topicDescription": "The discovery that yeast are living organisms",
    "keyPoints": [
      "Microscopic life exists",
      "Yeast consume sugar and produce alcohol",
      "Different yeast strains"
    ]
  }
]
```

### Spec File Fields

**Required:**
- `paperId` - Unique snake_case identifier
- `title` - Full academic title
- `field` - One of: cuisine, metallurgy, agriculture, arcane, nature, etc.
- `paperSets` - Array of set IDs this paper belongs to
- `prerequisitePapers` - Array of paper IDs (can be empty for foundation papers)
- `complexity` - 1-10 difficulty scale
- `minimumAge` - 'teen', 'adult', or 'elder'
- `skillGrants` - Object mapping skills to points granted
- `contributesTo` - Array of unlocks (recipes, buildings, abilities, spells, etc.)
- `topicDescription` - What the paper is about (for AI generation)
- `keyPoints` - Array of main points to cover (guides AI generation)

**Optional:**
- `minimumSkills` - Object mapping skills to minimum required levels

## Batch Processing Workflow

### 1. Plan Your Batch

Create a spec file for 5-10 related papers. Example batches:

- **Brewing Fermentation** (6 papers) ✅ Example provided
- **Blood Magic - Fuel** (5 papers)
- **Necromancy - Death** (5 papers)
- **Fire Magic - Basics** (5 papers)

### 2. Generate Papers

```bash
./generate-batch.sh paper-specs/your-batch.json ../packages/world/src/research-papers/your-output.ts
```

This will:
- Call Anthropic API for each paper
- Generate full text with 15-20+ footnotes
- Format as TypeScript
- Write to output file

### 3. Review & Edit

The AI does a good job but review for:
- Factual accuracy within the game world
- Footnote quality and humor
- Prerequisite relationships
- Skill grants and complexity ratings

### 4. Integrate

Add to the research system:

**a) Export from index.ts:**
```typescript
// In packages/world/src/research-papers/index.ts
export * from './brewing-fermentation-papers.js';

// Add to ALL_RESEARCH_PAPERS
import { GENERATED_PAPERS } from './brewing-fermentation-papers.js';
export const ALL_RESEARCH_PAPERS: ResearchPaper[] = [
  ...AGRICULTURE_PAPERS,
  ...GENERATED_PAPERS  // Add this
];
```

**b) Create ResearchSet in research-sets.ts:**
```typescript
export const BREWING_FERMENTATION_SET: ResearchSet = {
  setId: 'brewing_fermentation',
  name: 'Fermentation Science',
  description: 'Understanding yeast and the fermentation process',
  field: 'cuisine',
  allPapers: [
    'microbial_discovery',
    'anaerobic_respiration',
    // ... all paper IDs
  ],
  unlocks: [
    {
      technologyId: 'basic_brewing',
      papersRequired: 2,
      mandatoryPapers: ['microbial_discovery'],
      grants: [
        { type: 'recipe', recipeId: 'simple_beer' }
      ]
    }
  ]
};
```

**c) Verify build:**
```bash
cd .. && npm run build
```

## Parallel Generation Strategy

To generate thousands of papers efficiently:

### 1. Create All Spec Files First

Break down into manageable batches (5-10 papers each):

```
paper-specs/
├── brewing-fermentation.json (6 papers) ✅
├── brewing-ingredients.json (6 papers)
├── brewing-process.json (6 papers)
├── blood-magic-fuel.json (5 papers)
├── blood-magic-geometry.json (5 papers)
├── necromancy-death.json (5 papers)
... etc
```

### 2. Run Multiple Generators in Parallel

Open multiple terminals and run batches simultaneously:

```bash
# Terminal 1
./generate-batch.sh paper-specs/brewing-ingredients.json ...

# Terminal 2
./generate-batch.sh paper-specs/blood-magic-fuel.json ...

# Terminal 3
./generate-batch.sh paper-specs/necromancy-death.json ...
```

Or use a parallel runner:

```bash
# Generate all specs in parallel (careful with rate limits!)
ls paper-specs/*.json | xargs -P 4 -I {} ./generate-batch.sh {} ../packages/world/src/research-papers/{}.ts
```

### 3. Rate Limit Considerations

The script includes a 1-second delay between papers. For 6 papers:
- Generation time: ~6-12 seconds per batch
- Safe to run 4-5 batches in parallel
- Can generate ~30 papers per minute

With 200 batches:
- Sequential: ~20-40 minutes
- Parallel (5x): ~4-8 minutes

## Cost Estimation

Using Sonnet (claude-sonnet-4-20250514):
- Input: ~1,500 tokens per paper (prompt)
- Output: ~1,500 tokens per paper (generated text)
- Total: ~3,000 tokens per paper

For 5,000 papers:
- Total tokens: ~15M tokens
- Cost: ~$45-60 (at Sonnet rates)

Very reasonable for thousands of high-quality papers!

## Troubleshooting

**API Key Error:**
```
Error: No API key provided
```
→ Check that `../.env` exists and contains `ANTHROPIC_API_KEY=...`

**Rate Limit Error:**
```
429 Too Many Requests
```
→ Reduce parallel batches or increase delay in generate-research-paper.ts

**TypeScript Errors:**
```
Property 'X' does not exist
```
→ Review the generated output, might need manual fixes

**Build Fails:**
```
npm run build fails
```
→ Check that all exported constants are valid TypeScript

## Example Workflow: Generating 30 Blood Magic Papers

```bash
# 1. Create 6 spec files (5 papers each)
paper-specs/blood-magic-fuel.json
paper-specs/blood-magic-geometry.json
paper-specs/blood-magic-hemomancy.json
paper-specs/blood-magic-contracts.json
paper-specs/blood-magic-healing.json
paper-specs/blood-magic-advanced.json

# 2. Generate all batches (can run in parallel)
./generate-batch.sh paper-specs/blood-magic-fuel.json ../packages/world/src/research-papers/blood-magic-fuel-papers.ts
# ... repeat for each

# 3. Combine into single file or keep separate

# 4. Create BloodMagicSet in research-sets.ts

# 5. Export from index.ts

# 6. Build & verify
npm run build
```

## Next Steps

1. ✅ Test with brewing-fermentation spec
2. Create specs for all batches (200+ spec files)
3. Run batch generation (parallel)
4. Review and edit generated papers
5. Integrate into research system
6. Create all ResearchSets
7. Profit!

The system is ready to generate thousands of papers with minimal manual work!
