# JSON Migration Task - 14 Remaining Files

## Overview
Update 14 TypeScript files to load data from JSON instead of inline definitions. Follow the pattern established in completed files like `RaceTemplates.ts` and `ProfessionTemplates.ts`.

## Pattern to Follow

```typescript
// OLD PATTERN (inline data):
export const ITEMS = [
  { id: 'item1', name: 'Item 1', ... },
  { id: 'item2', name: 'Item 2', ... },
];

// NEW PATTERN (load from JSON):
import dataJson from '../data/file.json';

function loadData(): ItemType[] {
  const items = dataJson as ItemType[];
  if (!items || !Array.isArray(items)) {
    throw new Error(`Failed to load data from JSON`);
  }
  return items;
}

export const ALL_ITEMS: ItemType[] = loadData();
export const SPECIFIC_ITEM = ALL_ITEMS.find(x => x.id === 'id')!;
```

## Critical Requirements
1. **Use JSON imports** - `import dataJson from '../path/to/file.json';`
2. **No silent fallbacks** - Throw errors if data missing or invalid
3. **Keep all exports** - Maintain backward compatibility with existing code
4. **Preserve helper functions** - Keep all utility functions that use the data
5. **Correct relative paths** - Calculate from TypeScript file to JSON file

## Files to Update

### 1. City Configuration (1 file)
**File:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/building-designer/src/city-generator.ts`
**JSON:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/building-designer/data/city-config.json`
**Relative path from TS:** `../data/city-config.json`
**Note:** This is a HUGE file (4373 lines). Look for large constant arrays/objects to replace. Keep all interface/type definitions and utility functions.

### 2. Planet Presets (1 file)
**File:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/world/src/planet/PlanetPresets.ts`
**JSON:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/world/data/planet-presets.json`
**Relative path from TS:** `../../data/planet-presets.json`
**Export to preserve:** `PLANET_TERRAIN_PRESETS` (Record<PlanetType, PlanetPreset>)
**Helper functions:** `getPlanetPreset`, `createPlanetConfigFromPreset`, `createHomeworldConfig`, `getRandomPlanetType`

### 3-9. Specialized Buildings (7 files) - ALL load from same JSON
**JSON Source:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/data/specialized-buildings.json`
**Relative path from all:** `../../data/specialized-buildings.json`

**Structure of JSON:**
```json
{
  "categories": { ... },
  "buildings": [ array of all buildings with "subcategory" field ]
}
```

**Files:**
3. `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/buildings/SpaceflightProductionBuildings.ts`
   - Filter: `subcategory === "spaceflight_production"`
   - Export: `SPACEFLIGHT_PRODUCTION_BLUEPRINTS`

4. `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/buildings/ShipyardBlueprints.ts`
   - Filter: `subcategory === "shipyard"`
   - Export: `SHIPYARD_BLUEPRINTS`

5. `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/buildings/AutomationBuildings.ts`
   - Filter: `subcategory === "automation"`
   - Export: `ALL_AUTOMATION_BUILDINGS` (and helper functions)

6. `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/buildings/GovernanceBlueprints.ts`
   - Filter: `subcategory === "governance"`
   - Export: `GOVERNANCE_BLUEPRINTS`

7. `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/buildings/TempleBlueprints.ts`
   - Filter: `subcategory === "religious"`
   - Export: `TEMPLE_BLUEPRINTS`

8. `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/buildings/ShopBlueprints.ts`
   - Filter: `subcategory === "commercial"`
   - Export: `SHOP_BLUEPRINTS`

9. `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/buildings/MidwiferyBlueprints.ts`
   - Filter: `subcategory === "maternal_care"`
   - Export: `MIDWIFERY_BLUEPRINTS`

### 10-12. Research (3 files)
10. `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/research/SpaceshipResearch.ts`
    - JSON: `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/data/research/spaceship.json`
    - Relative path: `../../data/research/spaceship.json`
    - Pattern: File exports individual constants like `BASIC_PROPULSION`, `WORLDSHIP_DESIGN`, etc.
    - **Important:** Create individual exports by finding items in array

11. `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/research/clarketechResearch.ts`
    - JSON: `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/data/research/clarketech.json`
    - Relative path: `../../data/research/clarketech.json`

12. `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/research/defaultResearch.ts`
    - JSON: `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/data/research/default.json`
    - Relative path: `../../data/research/default.json`

### 13-14. Items & Recipes (2 files)
13. `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/items/SpaceflightItems.ts`
    - JSON: `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/data/items/spaceflight.json`
    - Relative path: `../../data/items/spaceflight.json`
    - Note: File exports multiple arrays like `RAW_SPACEFLIGHT_RESOURCES`, `PROCESSED_SPACEFLIGHT_MATERIALS`, etc.

14. `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/crafting/SpaceflightRecipes.ts`
    - JSON: `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/data/recipes/spaceflight.json`
    - Relative path: `../../data/recipes/spaceflight.json`

## Example Migration (from completed file)

```typescript
// BEFORE (MediumPlotTemplates.ts):
export const MEDIUM_PLOT_TEMPLATES: MicroPlotBlueprint[] = [
  {
    id: 'temple_of_the_twin_suns',
    name: 'Temple of the Twin Suns',
    description: 'A sacred temple...',
    // ... 50 more lines
  },
  // ... 10 more templates
];

// AFTER:
import templatesJson from '../../data/medium-plot-templates.json';

function loadMediumPlotTemplates(): MicroPlotBlueprint[] {
  const templates = templatesJson as MicroPlotBlueprint[];
  if (!templates || !Array.isArray(templates)) {
    throw new Error('Failed to load medium plot templates from JSON');
  }
  return templates;
}

export const MEDIUM_PLOT_TEMPLATES: MicroPlotBlueprint[] = loadMediumPlotTemplates();
```

## Testing After Migration
1. Run `cd custom_game_engine && npm run build` - MUST succeed
2. Check for TypeScript errors
3. Ensure no runtime errors when loading game
4. Verify exports are still accessible

## Deliverables
1. All 14 files successfully updated
2. Report:
   - Number of files updated: 14
   - Total lines removed (approximate count from inline data)
   - Any issues encountered
   - Build verification status (pass/fail)

## Notes
- For AutomationBuildings.ts, preserve the interface definitions and helper functions like `getAvailableAutomationBuildings`
- For research files, if they export individual constants, find them in the loaded array by ID
- For city-generator.ts, focus on large data objects like `BIOME_CITY_TYPES`, `DISTRICT_AFFINITIES`, etc. Keep all interfaces and generator functions
- Throw errors, don't use fallback values (per CLAUDE.md code quality rules)
