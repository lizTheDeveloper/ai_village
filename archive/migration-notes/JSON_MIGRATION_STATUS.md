# JSON Migration Status - 14 Files Total

## Completed (3/14) ✓

### 1. PlanetPresets.ts ✓
- **File:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/world/src/planet/PlanetPresets.ts`
- **JSON:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/world/data/planet-presets.json`
- **Status:** COMPLETE
- **Lines:** 736 → 79 (657 lines removed)
- **Pattern:** Load entire presets Record from JSON

### 2. SpaceflightProductionBuildings.ts ✓
- **File:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/buildings/SpaceflightProductionBuildings.ts`
- **JSON:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/data/specialized-buildings.json`
- **Subcategory:** `spaceflight_production`
- **Status:** COMPLETE
- **Lines:** 589 → 51 (538 lines removed)
- **Buildings:** 12 found in JSON

### 3. ShipyardBlueprints.ts (PARTIALLY DONE - needs cleanup)
- **File:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/buildings/ShipyardBlueprints.ts`
- **JSON:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/data/specialized-buildings.json`
- **Subcategory:** `shipyard`
- **Status:** IN PROGRESS (loader added, inline data not yet removed)
- **Buildings:** 11 found in JSON
- **TODO:** Remove lines 49-477 (inline building definitions)

## Remaining (11/14)

### Building Files (5 remaining)

All load from: `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/data/specialized-buildings.json`

**Pattern for all:**
```typescript
import specializedBuildingsData from '../../data/specialized-buildings.json';

interface SpecializedBuildingsData {
  categories: Record<string, unknown>;
  buildings: Array<BuildingBlueprint & { subcategory?: string }>;
}

function load{Name}Blueprints(): BuildingBlueprint[] {
  const data = specializedBuildingsData as SpecializedBuildingsData;
  if (!data || !data.buildings || !Array.isArray(data.buildings)) {
    throw new Error('Failed to load specialized buildings from JSON');
  }
  const blueprints = data.buildings.filter(b => b.subcategory === '{subcategory}');
  if (blueprints.length === 0) {
    throw new Error('No {subcategory} buildings found in JSON');
  }
  return blueprints;
}

export const {EXPORT_NAME}: BuildingBlueprint[] = load{Name}Blueprints();
```

#### 4. AutomationBuildings.ts
- **File:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/buildings/AutomationBuildings.ts`
- **Subcategory:** `automation`
- **Export:** `ALL_AUTOMATION_BUILDINGS`
- **Note:** Keep helper functions: `getAvailableAutomationBuildings`, `getBuildingsByCategory`, `getAdjustedConstructionTime`
- **Buildings:** TBD (check JSON)

#### 5. GovernanceBlueprints.ts
- **File:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/buildings/GovernanceBlueprints.ts`
- **Subcategory:** `governance`
- **Export:** `GOVERNANCE_BLUEPRINTS`
- **Buildings:** TBD (check JSON)

#### 6. TempleBlueprints.ts
- **File:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/buildings/TempleBlueprints.ts`
- **Subcategory:** `religious`
- **Export:** `TEMPLE_BLUEPRINTS`
- **Buildings:** TBD (check JSON)

#### 7. ShopBlueprints.ts
- **File:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/buildings/ShopBlueprints.ts`
- **Subcategory:** `commercial`
- **Export:** `SHOP_BLUEPRINTS`
- **Buildings:** TBD (check JSON)

#### 8. MidwiferyBlueprints.ts
- **File:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/buildings/MidwiferyBlueprints.ts`
- **Subcategory:** `maternal_care`
- **Export:** `MIDWIFERY_BLUEPRINTS`
- **Buildings:** TBD (check JSON)

### Research Files (3 remaining)

#### 9. SpaceshipResearch.ts
- **File:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/research/SpaceshipResearch.ts`
- **JSON:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/data/research/spaceship.json`
- **Relative path:** `../../data/research/spaceship.json`
- **Pattern:** JSON is array of ResearchDefinition. File exports individual constants by ID
- **Example exports:** `BASIC_PROPULSION`, `WORLDSHIP_DESIGN`, `THRESHOLD_SHIP`, etc.
- **Note:** Need to load array, then create individual exports by finding items

#### 10. clarketechResearch.ts
- **File:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/research/clarketechResearch.ts`
- **JSON:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/data/research/clarketech.json`
- **Relative path:** `../../data/research/clarketech.json`

#### 11. defaultResearch.ts
- **File:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/research/defaultResearch.ts`
- **JSON:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/data/research/default.json`
- **Relative path:** `../../data/research/default.json`

### Items & Recipes (2 remaining)

#### 12. SpaceflightItems.ts
- **File:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/items/SpaceflightItems.ts`
- **JSON:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/data/items/spaceflight.json`
- **Relative path:** `../../data/items/spaceflight.json`
- **Note:** File exports multiple arrays like `RAW_SPACEFLIGHT_RESOURCES`, `PROCESSED_SPACEFLIGHT_MATERIALS`, etc.

#### 13. SpaceflightRecipes.ts
- **File:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/crafting/SpaceflightRecipes.ts`
- **JSON:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/data/recipes/spaceflight.json`
- **Relative path:** `../../data/recipes/spaceflight.json`

### City Generator (1 remaining - LARGE FILE)

#### 14. city-generator.ts
- **File:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/building-designer/src/city-generator.ts`
- **JSON:** `/Users/annhoward/src/ai_village/custom_game_engine/packages/building-designer/data/city-config.json`
- **Relative path:** `../data/city-config.json`
- **Note:** 4373 lines! Keep all interfaces, types, and functions. Only replace large constant data objects.
- **Targets:** Look for `CITY_SPACING`, `CITY_DENSITY_PER_MILLION_KM2`, `BIOME_CITY_TYPES`, `BIOME_MAX_CITY_SIZE`, `DISTRICT_AFFINITIES`, etc.

## Summary Statistics (So Far)

- **Files completed:** 3/14
- **Lines removed:** 1,195+ (657 + 538)
- **Files in progress:** 1
- **Remaining:** 11

## Next Steps

1. **Finish ShipyardBlueprints.ts** - Remove inline data (lines 49-477)
2. **Complete 5 remaining building files** - All follow same pattern
3. **Update 3 research files** - Individual exports pattern
4. **Update 2 items/recipes files** - Array exports pattern
5. **Update city-generator.ts** - Complex, large file
6. **Build verification** - Run `cd custom_game_engine && npm run build`
7. **Final report** - Total files, total lines removed, any issues

## Validation Commands

```bash
# Count buildings in JSON by subcategory
cd /Users/annhoward/src/ai_village/custom_game_engine/packages/core
jq '.buildings | map(select(.subcategory == "automation")) | length' data/specialized-buildings.json
jq '.buildings | map(select(.subcategory == "governance")) | length' data/specialized-buildings.json
jq '.buildings | map(select(.subcategory == "religious")) | length' data/specialized-buildings.json
jq '.buildings | map(select(.subcategory == "commercial")) | length' data/specialized-buildings.json
jq '.buildings | map(select(.subcategory == "maternal_care")) | length' data/specialized-buildings.json

# Count research items
jq 'length' data/research/spaceship.json
jq 'length' data/research/clarketech.json
jq 'length' data/research/default.json

# Count items/recipes
jq 'length' data/items/spaceflight.json
jq 'length' data/recipes/spaceflight.json
```

## Testing After All Changes

```bash
cd custom_game_engine
npm run build          # Must succeed
./start.sh             # Verify game loads
# Check browser console for errors
```
