# Research Paper Batch Generation Inventory

This document lists all available paper spec files ready for batch generation.

## Available Spec Files (15 batches, 75+ papers)

### Brewing & Fermentation
1. **brewing-fermentation.json** (6 papers) ✅ GENERATED
   - Microbial discovery, anaerobic respiration, temperature control, wild yeast, pH management, yeast genetics

### Blood Magic
2. **blood-magic-fuel.json** (5 papers)
   - Blood as mana, conversion efficiency, blood types, consent paradox, preservation
3. **blood-magic-geometry.json** (5 papers)
   - Blood circles, pentagrams, sigils, 3D arrays, fractals

### Necromancy
4. **necromancy-death.json** (5 papers)
   - Death detection, soul departure, corpse preservation, death energy, undead taxonomy

### Fire Magic
5. **fire-magic-basics.json** (5 papers)
   - Flame generation, fire control, temperature variation, fire immunity, combustion

### Metallurgy
6. **metallurgy-smelting.json** (5 papers)
   - Ore identification, furnace construction, iron smelting, bronze alloys, slag separation

### Alchemy
7. **alchemy-fundamentals.json** (5 papers)
   - Four elements, dissolution, distillation, calcination, tria prima

### Agriculture
8. **agriculture-advanced.json** (5 papers)
   - Companion planting, pest management, soil testing, grafting, greenhouses

### Rune Magic
9. **rune-magic-advanced.json** (5 papers)
   - Power words, animated runes, runic golems, explosive runes, master runes

### Herbalism
10. **herbalism-medicinal.json** (5 papers)
    - Herb identification, extraction methods, pain management, antimicrobials, dosing

### Enchanting
11. **enchanting-basics.json** (5 papers)
    - Mana infusion, material affinity, sharpness, durability, elemental enchantments

### Cooking
12. **cooking-advanced.json** (5 papers)
    - Heat control, knife skills, emulsification, stocks, pastry chemistry

### Construction
13. **construction-masonry.json** (5 papers)
    - Mortar composition, stone selection, arches, foundations, domes

### Textiles
14. **textiles-weaving.json** (5 papers)
    - Fiber preparation, spinning, loom construction, weaving patterns, natural dyes

### Water Magic
15. **water-magic-basics.json** (5 papers)
    - Water creation, water shaping, ice formation, water breathing, healing waters

## Quick Generation Commands

Generate a single batch:
```bash
cd scripts
./generate-batch.sh paper-specs/blood-magic-fuel.json ../packages/world/src/research-papers/blood-magic-fuel-papers.ts
```

Generate all batches (sequential):
```bash
cd scripts
for spec in paper-specs/*.json; do
  basename=$(basename "$spec" .json)
  ./generate-batch.sh "$spec" "../packages/world/src/research-papers/${basename}-papers.ts"
done
```

Generate in parallel (careful with rate limits - max 4-5 at once):
```bash
cd scripts
ls paper-specs/*.json | xargs -P 4 -I {} bash -c 'basename=$(basename {} .json); ./generate-batch.sh {} ../packages/world/src/research-papers/${basename}-papers.ts'
```

## Cost Estimation

- Papers per batch: 5-6
- Tokens per paper: ~1,500 input + ~1,500 output = ~3,000 total
- Sonnet 4.5 pricing: $3/M input, $15/M output

**Per batch (5 papers):**
- Input: 7,500 tokens × $3/M = $0.0225
- Output: 7,500 tokens × $15/M = $0.1125
- Total per batch: ~$0.14

**All 15 batches (75 papers):**
- Total cost: ~$2.10

**Scaling to 1,000 papers (200 batches):**
- Total cost: ~$28

Very affordable for thousands of high-quality research papers!

## Next Steps After Generation

1. Review generated papers for quality
2. Add exports to `packages/world/src/research-papers/index.ts`
3. Create ResearchSets in `research-sets.ts` for each domain
4. Run `npm run build` to verify compilation
5. Create more spec files for additional domains as needed

## Expansion Domains (Not Yet Created)

Suggested additional batches for comprehensive coverage:

### Magic Systems (30+ more batches)
- Earth magic, Air magic, Lightning magic
- Illusion magic, Divination magic, Transmutation
- Shadow magic, Light magic, Time magic
- Summoning, Binding, Banishment
- Curse magic, Blessing magic, Ward magic

### Crafting (20+ more batches)
- Leatherworking, Carpentry, Glassblowing
- Pottery, Jewelry, Blacksmithing advanced
- Papermaking, Bookbinding, Calligraphy
- Musical instruments, Weapon crafting, Armor crafting

### Technologies (20+ more batches)
- Advanced metallurgy, Advanced agriculture
- Medicine, Surgery, Anatomy
- Astronomy, Mathematics, Physics
- Chemistry, Biology, Geology

### Combat & Tactics (10+ batches)
- Swordsmanship, Archery, Tactics
- Siege warfare, Naval combat, Mounted combat

Total potential: 200+ batches = 1,000+ papers covering all game systems
