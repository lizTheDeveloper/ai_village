# Crafting UI - Specification

**Created:** 2025-12-21
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The crafting UI allows players to create items, tools, and materials from gathered resources. It provides recipe browsing, ingredient management, crafting queue control, and integrates with workstations that unlock specialized recipes.

---

## Requirements

### REQ-CRAFT-001: Crafting Panel Structure

The crafting UI SHALL be organized into distinct sections.

```typescript
interface CraftingPanel {
  // State
  isOpen: boolean;
  currentStation: Workstation | null;  // null = hand crafting

  // Sections
  recipeList: RecipeListSection;
  recipeDetails: RecipeDetailsSection;
  ingredientPanel: IngredientPanel;
  craftingQueue: CraftingQueueSection;

  // Filters
  activeCategory: RecipeCategory | "all";
  searchQuery: string;
  showCraftable: "all" | "craftable" | "missing_one" | "locked";
  sortMode: RecipeSortMode;
}

type RecipeCategory =
  | "tools"
  | "weapons"
  | "armor"
  | "food"
  | "materials"
  | "furniture"
  | "machines"
  | "decorations"
  | "special";

type RecipeSortMode =
  | "name"
  | "category"
  | "recently_used"
  | "craftable_first"
  | "level_required";
```

### REQ-CRAFT-002: Recipe List

Players SHALL browse available recipes.

```typescript
interface RecipeListSection {
  recipes: Recipe[];
  filteredRecipes: Recipe[];
  selectedRecipe: Recipe | null;

  // Display
  viewMode: "grid" | "list";
  showLockedRecipes: boolean;
  showUncraftableRecipes: boolean;

  // Grouping
  groupByCategory: boolean;
  collapsedCategories: Set<RecipeCategory>;
}

interface Recipe {
  id: string;
  name: string;
  description: string;
  category: RecipeCategory;
  icon: string;

  // Requirements
  ingredients: Ingredient[];
  stationRequired: string | null;   // null = hand craft
  skillRequired?: { skill: string; level: number };
  researchRequired?: string;        // Tech unlock

  // Output
  output: ItemStack;
  byproducts?: ItemStack[];         // Secondary outputs

  // Crafting
  craftTime: number;                // Seconds
  experienceGain: number;

  // State
  unlocked: boolean;
  timesCreated: number;
  favorited: boolean;
}

interface Ingredient {
  itemId: string;
  itemName: string;
  icon: string;
  required: number;
  available: number;                // In player inventory
  consumed: boolean;                // Some ingredients not consumed (tools)
}
```

**Recipe List (Grid View):**
```
┌─────────────────────────────────────────────────────────────┐
│  RECIPES                    [Grid][List] [🔍 Search...    ] │
├─────────────────────────────────────────────────────────────┤
│  [All] [Tools] [Weapons] [Food] [Materials] [Furniture]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ── TOOLS ────────────────────────────────────────────────  │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ 🪓  │ │ ⛏️  │ │ 🔨  │ │ 🪚  │ │ 🎣  │ │ 🔒  │           │
│  │ Axe │ │Pick │ │Hammr│ │ Saw │ │ Rod │ │Lockd│           │
│  │  ✓  │ │  ✓  │ │  ✓  │ │  !  │ │  ✗  │ │  🔒 │           │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘           │
│                                                             │
│  ── FOOD ─────────────────────────────────────────────────  │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                           │
│  │ 🍞  │ │ 🥧  │ │ 🍲  │ │ 🥗  │                           │
│  │Bread│ │ Pie │ │Stew │ │Salad│                           │
│  │  ✓  │ │  !  │ │  ✗  │ │  ✓  │                           │
│  └─────┘ └─────┘ └─────┘ └─────┘                           │
│                                                             │
│  ✓ = Can craft   ! = Missing 1   ✗ = Can't craft   🔒 = Locked│
└─────────────────────────────────────────────────────────────┘
```

**Recipe List (List View):**
```
┌─────────────────────────────────────────────────────────────┐
│  RECIPES                    [Grid][List] [🔍 Search...    ] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───┬────────────────┬──────────────┬────────┬──────────┐  │
│  │   │ Name           │ Ingredients  │ Station│ Status   │  │
│  ├───┼────────────────┼──────────────┼────────┼──────────┤  │
│  │🪓 │ Stone Axe      │ 2🪨 3🪵      │ None   │ ✓ Ready  │  │
│  │⛏️ │ Stone Pickaxe  │ 2🪨 3🪵      │ None   │ ✓ Ready  │  │
│  │🔨 │ Iron Hammer    │ 3🔩 2🪵      │ Forge  │ ✓ Ready  │  │
│  │🪚 │ Iron Saw       │ 4🔩 1🪵      │ Forge  │ ! Need 1 │  │
│  │🍞 │ Bread          │ 3🌾          │ Oven   │ ✓ Ready  │  │
│  │🥧 │ Berry Pie      │ 2🌾 5🫐 1🧈  │ Oven   │ ! Need 🧈│  │
│  │🔒 │ Steel Sword    │ ???          │ Forge  │ 🔒 Locked│  │
│  └───┴────────────────┴──────────────┴────────┴──────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### REQ-CRAFT-003: Recipe Details

Selecting a recipe SHALL show full details.

```typescript
interface RecipeDetailsSection {
  recipe: Recipe | null;

  // Crafting options
  craftAmount: number;
  maxCraftable: number;             // Based on ingredients

  // Preview
  showOutputPreview: boolean;
  showStatComparison: boolean;      // vs equipped
}
```

**Recipe Details Panel:**
```
┌─────────────────────────────────────────────────────────────┐
│  STONE AXE                                          ⭐      │
│  Tool · Hand Craftable                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│       ┌─────────┐                                           │
│       │         │                                           │
│       │   🪓    │   A basic axe for chopping wood.          │
│       │         │   Essential for gathering lumber.         │
│       └─────────┘                                           │
│                                                             │
│  ── OUTPUT ──────────────────────────────────────────────   │
│  🪓 Stone Axe ×1                                            │
│     Damage: 5-8                                             │
│     Durability: 50                                          │
│     Chop Speed: 1.2x                                        │
│                                                             │
│  ── INGREDIENTS ─────────────────────────────────────────   │
│  ┌────────────┬──────────┬───────────┐                      │
│  │ 🪨 Stone   │ Need: 2  │ Have: 45  │ ✓                    │
│  │ 🪵 Wood    │ Need: 3  │ Have: 28  │ ✓                    │
│  │ 🌿 Fiber   │ Need: 1  │ Have: 12  │ ✓                    │
│  └────────────┴──────────┴───────────┘                      │
│                                                             │
│  ── CRAFTING ────────────────────────────────────────────   │
│  Time: 5 seconds                                            │
│  XP Gain: +10 Crafting                                      │
│  Station: None (Hand Craft)                                 │
│                                                             │
│  Amount: [-] [  3  ] [+]      Max: 9                        │
│                                                             │
│           [Add to Queue]   [Craft Now]                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### REQ-CRAFT-004: Ingredient Display

Ingredients SHALL show availability status.

```typescript
interface IngredientPanel {
  ingredients: IngredientStatus[];
  allAvailable: boolean;
  missingCount: number;
}

interface IngredientStatus {
  ingredient: Ingredient;
  status: "available" | "partial" | "missing" | "in_storage";
  sources: IngredientSource[];
}

interface IngredientSource {
  location: "inventory" | "storage" | "nearby";
  containerId?: string;
  containerName?: string;
  available: number;
}
```

**Ingredient Status Indicators:**
```
AVAILABLE (green):
┌────────────────────────────────┐
│ ✓ 🪨 Stone      2/2  (Have 45) │
└────────────────────────────────┘

PARTIAL (yellow):
┌────────────────────────────────┐
│ ! 🔩 Iron Ingot  1/3  (Have 1) │
│   Need 2 more                  │
└────────────────────────────────┘

MISSING (red):
┌────────────────────────────────┐
│ ✗ 🧈 Butter      0/1  (Have 0) │
│   [Find Recipe] [Buy]          │
└────────────────────────────────┘

IN STORAGE (blue):
┌────────────────────────────────┐
│ 📦 🪵 Wood       0/3  (Have 0) │
│   15 in Storage Chest          │
│   [Take from Storage]          │
└────────────────────────────────┘
```

### REQ-CRAFT-005: Crafting Queue

Players SHALL queue multiple crafting jobs.

```typescript
interface CraftingQueueSection {
  queue: CraftingJob[];
  maxQueueSize: number;
  currentJob: CraftingJob | null;

  // Controls
  pauseQueue(): void;
  resumeQueue(): void;
  cancelJob(jobId: string): void;
  reorderJob(jobId: string, newPosition: number): void;
  clearQueue(): void;
}

interface CraftingJob {
  id: string;
  recipe: Recipe;
  quantity: number;
  quantityCompleted: number;

  // Progress
  status: JobStatus;
  progress: number;                 // 0-1 for current item
  timeRemaining: number;            // Seconds

  // Timing
  queuedAt: GameTime;
  startedAt?: GameTime;
  completedAt?: GameTime;
}

type JobStatus =
  | "queued"
  | "crafting"
  | "paused"
  | "waiting_ingredients"
  | "waiting_station"
  | "completed"
  | "cancelled";
```

**Crafting Queue Panel:**
```
┌─────────────────────────────────────────────────────────────┐
│  CRAFTING QUEUE                          [⏸️ Pause] [🗑️ Clear]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ▶ CRAFTING NOW                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🪓 Stone Axe (2/3)                                  │    │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━●━━━━━━━  75%              │    │
│  │ Time remaining: 4s                      [Cancel]    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ── QUEUED ─────────────────────────────────────────────    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 1. ⛏️ Stone Pickaxe ×2           ~10s    [↑][↓][✗] │    │
│  │ 2. 🍞 Bread ×5                   ~25s    [↑][↓][✗] │    │
│  │ 3. 🔨 Iron Hammer ×1             ~30s    [↑][↓][✗] │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ⚠️ 4. 🥧 Berry Pie ×2 - Waiting for ingredients           │
│        Missing: 🧈 Butter ×2                                │
│                                                             │
│  Total time: ~1m 9s                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### REQ-CRAFT-006: Workstations

Workstations SHALL unlock specialized recipes.

```typescript
interface Workstation {
  id: string;
  type: WorkstationType;
  name: string;
  icon: string;

  // Recipes
  unlockedRecipes: string[];
  bonuses: CraftingBonus[];

  // Requirements
  fuelRequired: boolean;
  currentFuel: number;
  maxFuel: number;
  fuelConsumptionRate: number;

  // State
  isActive: boolean;
  currentRecipe: Recipe | null;
}

type WorkstationType =
  | "workbench"
  | "forge"
  | "anvil"
  | "oven"
  | "loom"
  | "tanning_rack"
  | "alchemy_table"
  | "enchanting_table"
  | "sawmill"
  | "kiln";

interface CraftingBonus {
  type: "speed" | "quality" | "yield" | "fuel_efficiency";
  multiplier: number;
  appliesTo: RecipeCategory[];
}
```

**Workstation Panel (when at station):**
```
┌─────────────────────────────────────────────────────────────┐
│  ⚒️ FORGE                                             [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Fuel: ━━━━━━━━━━━━━━━●━━━━━━  65%                         │
│  [+🪵 Add Wood] [+�ite Add Coal]                            │
│                                                             │
│  Bonuses:                                                   │
│  • Metalworking: +50% speed                                 │
│  • Tool crafting: +25% durability                           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  FORGE RECIPES                    [🔍 Search...           ] │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ 🔩  │ │ ⚔️  │ │ 🛡️  │ │ 🔨  │ │ ⛏️  │ │ 🪓  │           │
│  │Ingot│ │Sword│ │Shild│ │Hammr│ │ Pick│ │ Axe │           │
│  │  ✓  │ │  ✓  │ │  !  │ │  ✓  │ │  ✓  │ │  ✓  │           │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### REQ-CRAFT-007: Quick Craft

Common items SHALL support quick crafting.

```typescript
interface QuickCraft {
  favorites: Recipe[];
  recentlyUsed: Recipe[];
  maxRecent: number;

  // Quick craft from inventory
  quickCraftFromItem(itemId: string): Recipe[];  // Recipes using this
  quickCraftForTool(toolType: string): Recipe[]; // Replacement tools
}
```

**Quick Craft Menu (right-click ingredient):**
```
┌─────────────────────────────┐
│ 🪵 Wood (28)                │
├─────────────────────────────┤
│ CRAFT WITH THIS:            │
│ ▶ 🪓 Stone Axe        [C]   │
│ ▶ ⛏️ Stone Pickaxe    [C]   │
│ ▶ 🏠 Wooden Wall      [C]   │
│ ▶ 📦 Storage Chest    [C]   │
├─────────────────────────────┤
│ [Open Crafting Menu]        │
└─────────────────────────────┘
```

### REQ-CRAFT-008: Recipe Discovery

Locked recipes SHALL hint at unlock methods.

```typescript
interface RecipeDiscovery {
  // States
  known: boolean;                   // Recipe visible
  unlocked: boolean;                // Recipe craftable
  discovered: boolean;              // Found naturally

  // Unlock methods
  unlockMethod: UnlockMethod;
  unlockProgress?: number;          // 0-1 for progressive unlocks
  unlockHint: string;
}

type UnlockMethod =
  | { type: "research"; techId: string }
  | { type: "skill"; skill: string; level: number }
  | { type: "item"; itemId: string }      // Learn from item/book
  | { type: "npc"; npcId: string }        // Taught by NPC
  | { type: "discovery" }                 // Find ingredients
  | { type: "station"; stationType: string }
  | { type: "quest"; questId: string };
```

**Locked Recipe Display:**
```
┌─────────────────────────────────────────────────────────────┐
│  🔒 STEEL SWORD                                             │
│  Weapon · Requires Forge                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│       ┌─────────┐                                           │
│       │   🔒    │   Recipe Locked                           │
│       │   ⚔️    │                                           │
│       └─────────┘                                           │
│                                                             │
│  ── HOW TO UNLOCK ───────────────────────────────────────   │
│                                                             │
│  Research Required:                                         │
│  🔬 Advanced Metallurgy                                     │
│     Progress: ━━━━━━━━━━░░░░░░░░░░  50%                     │
│     [View in Tech Tree]                                     │
│                                                             │
│  ── PREVIEW ─────────────────────────────────────────────   │
│  Ingredients: ??? (hidden until unlocked)                   │
│  Output: ⚔️ Steel Sword                                     │
│     "A finely crafted blade of hardened steel"              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### REQ-CRAFT-009: Crafting Progress

Active crafting SHALL show progress feedback.

```typescript
interface CraftingProgress {
  // Visual
  progressBar: boolean;
  progressCircle: boolean;
  showPercentage: boolean;
  showTimeRemaining: boolean;

  // Animation
  craftingAnimation: boolean;
  particleEffects: boolean;
  soundEffects: boolean;

  // Completion
  completionSound: string;
  completionAnimation: string;
  autoCollect: boolean;             // Auto-add to inventory
}
```

**Crafting Progress (in-world and UI):**
```
IN-WORLD (at workstation):
                  ┌──────────────┐
                  │ Crafting...  │
                  │ 🪓 Stone Axe │
                  │ ━━━━━●━━━  60%│
                  └──────────────┘
                         │
                    ┌────┴────┐
                    │  ⚒️     │
                    │ (Forge) │
                    └─────────┘

COMPLETION:
                  ┌──────────────┐
                  │   ✨ Done! ✨  │
                  │ 🪓 Stone Axe │
                  │   [Collect]  │
                  └──────────────┘
```

### REQ-CRAFT-010: Batch Crafting

Players SHALL craft multiple items efficiently.

```typescript
interface BatchCrafting {
  // Controls
  amount: number;
  maxAmount: number;                // Limited by ingredients

  // Options
  craftAll: boolean;                // Craft max possible
  stopOnMissing: boolean;           // Stop if ingredients run out
  repeatUntilStopped: boolean;      // Infinite queue

  // Calculation
  totalTime: number;
  totalIngredients: Map<string, number>;
}
```

**Batch Crafting Controls:**
```
┌─────────────────────────────────────────────────────────────┐
│  CRAFT AMOUNT                                               │
│                                                             │
│  🪓 Stone Axe                                               │
│                                                             │
│  Amount: [−] [−10] [    15    ] [+10] [+] [MAX]            │
│                                                             │
│  ── TOTAL COST ──────────────────────────────────────────   │
│  🪨 Stone:  30 (Have: 45) ✓                                 │
│  🪵 Wood:   45 (Have: 28) ✗ Missing 17                      │
│  🌿 Fiber:  15 (Have: 12) ✗ Missing 3                       │
│                                                             │
│  Can craft: 9 (limited by 🪵 Wood)                          │
│  Total time: 45 seconds                                     │
│                                                             │
│  Options:                                                   │
│  [✓] Stop if ingredients run out                            │
│  [ ] Repeat continuously                                    │
│                                                             │
│           [Cancel]  [Craft 9]  [Craft All]                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Keyboard Shortcuts

### REQ-CRAFT-011: Crafting Hotkeys

```
CRAFTING PANEL:
- C              : Open/close crafting
- Escape         : Close panel
- Tab            : Switch recipe/queue focus
- Arrow keys     : Navigate recipes
- Enter          : Select recipe / Start craft
- Shift+Enter    : Add to queue
- 1-9            : Quick craft favorites

RECIPE LIST:
- F              : Toggle favorites filter
- Ctrl+F         : Focus search
- G              : Toggle grid/list view
- [ / ]          : Previous/next category

QUEUE:
- Delete         : Cancel selected job
- P              : Pause/resume queue
- Ctrl+Up/Down   : Reorder jobs
```

---

## Integration

### REQ-CRAFT-012: System Integration

```typescript
interface CraftingIntegration {
  // Inventory
  checkIngredients(recipe: Recipe): IngredientStatus[];
  consumeIngredients(recipe: Recipe, amount: number): boolean;
  addOutput(items: ItemStack[]): boolean;

  // Workstations
  getNearbyStations(): Workstation[];
  getStationRecipes(station: Workstation): Recipe[];

  // Research
  isRecipeUnlocked(recipeId: string): boolean;
  getUnlockRequirements(recipeId: string): UnlockMethod;

  // Skills
  getCraftingBonus(recipe: Recipe): number;
  awardCraftingXP(recipe: Recipe, amount: number): void;
}
```

---

## Open Questions

1. Experimental crafting (discover recipes by combining)?
2. Quality tiers for crafted items (based on skill)?
3. Crafting minigames for special items?
4. Blueprint system (save custom recipes)?
5. Repair vs. craft new decision?
6. Disassembly (break items into components)?

---

## Related Specs

**Core Integration:**
- `items-system/spec.md` - Item definitions
- `inventory.md` - Ingredient management
- `research-system/spec.md` - Recipe unlocks

**Dependencies:**
- `construction-system/spec.md` - Workstation building
- `agent-system/spec.md` - Skill bonuses
