# Research & Discovery System
## Extensible Abstraction Layer for Unlockable Content and Procedural Generation

> *Dedicated to:*
> - **Sid Meier** and *Civilization* - For the tech tree that defined a genre
> - **Klei Entertainment** and *Oxygen Not Included* - For research-driven progression
> - **Tarn Adams** and *Dwarf Fortress* - For procedurally generated content and emergent discoveries
> - **The spirit of invention** - Where curiosity drives progress

---

## Overview

Design an **extensible abstraction layer** for the Research & Discovery system that:
1. Enables research to unlock content across all registries (items, buildings, recipes, behaviors)
2. Supports procedural content generation via LLM
3. Handles capability gap detection for game evolution
4. Minimizes changes to existing registry patterns

### Core Philosophy

**Research is not a separate system—it is a lens through which all content flows.** Items, recipes, buildings, and abilities are not "available" or "unavailable"—they are "discovered" or "undiscovered." The research system doesn't own content; it gates access to content owned by registries.

### Key Innovations

1. **Central unlock query service** - One place to check "is X unlocked?"
2. **Event-driven unlocks** - Research completion triggers cascading unlocks
3. **Procedural invention** - LLM generates new content when agents experiment
4. **Capability gap detection** - System notices when agents want something unsupported
5. **Minimal registry changes** - Existing registries unchanged, wrapped with filtering
6. **Per-world state** - Research progress is per-save, not global

---

## Part 1: Core Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RESEARCH ABSTRACTION LAYER                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐     │
│  │ ResearchRegistry │    │ ResearchState   │    │ ContentGenerator    │     │
│  │                 │    │ Component       │    │                     │     │
│  │ - definitions   │    │ - unlocked[]    │    │ - LLM integration   │     │
│  │ - tech tree     │    │ - progress{}    │    │ - constraints       │     │
│  │ - unlocks       │    │ - insights[]    │    │ - validation        │     │
│  └────────┬────────┘    └────────┬────────┘    └──────────┬──────────┘     │
│           │                      │                        │                 │
│           └──────────────────────┼────────────────────────┘                 │
│                                  │                                          │
│                     ┌────────────▼────────────┐                             │
│                     │    ResearchSystem       │                             │
│                     │                         │                             │
│                     │ - progress tracking     │                             │
│                     │ - completion handling   │                             │
│                     │ - unlock propagation    │                             │
│                     │ - event emission        │                             │
│                     └────────────┬────────────┘                             │
│                                  │                                          │
│                     ┌────────────▼────────────┐                             │
│                     │   UnlockQueryService    │                             │
│                     │                         │                             │
│                     │ - isResearchUnlocked()  │                             │
│                     │ - getUnlockedRecipes()  │                             │
│                     │ - getUnlockedBuildings()│                             │
│                     │ - getAvailableResearch()│                             │
│                     └─────────────────────────┘                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                ▼                   ▼                   ▼
        ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
        │ ItemRegistry  │   │ RecipeRegistry│   │ BuildingReg.  │
        └───────────────┘   └───────────────┘   └───────────────┘
```

---

## Part 2: Research Registry

### Research Definitions (Tech Tree)

```typescript
// packages/core/src/research/ResearchRegistry.ts

export type ResearchField =
  | 'agriculture'     // Farming, plants, seeds
  | 'construction'    // Buildings, architecture
  | 'crafting'        // Tools, items, manufacturing
  | 'metallurgy'      // Metals, alloys, forging
  | 'alchemy'         // Potions, transformations
  | 'textiles'        // Cloth, clothing, weaving
  | 'cuisine'         // Cooking, food preservation
  | 'machinery'       // Automation, mechanical devices
  | 'nature'          // Ecology, biology, botany
  | 'society'         // Social systems, governance
  | 'arcane'          // Magic research
  | 'experimental'    // Procedural invention
  ;

export interface ResearchDefinition {
  id: string;
  name: string;
  description: string;
  field: ResearchField;
  tier: number;                        // 1-5+ complexity

  // Progress requirements
  progressRequired: number;            // Research points needed
  requiredItems?: ItemStack[];         // Consumed on start (e.g., samples)
  requiredBuilding?: string;           // Lab/facility type needed

  // Prerequisites
  prerequisites: string[];             // Other research IDs

  // What completing this unlocks
  unlocks: ResearchUnlock[];

  // Type
  type: 'predefined' | 'generated' | 'experimental';

  // Generation metadata (for LLM-generated research)
  generatedBy?: string;                // Agent ID
  generationContext?: GenerationContext;
}

export type ResearchUnlock =
  | { type: 'recipe'; recipeId: string }
  | { type: 'building'; buildingId: string }
  | { type: 'item'; itemId: string }
  | { type: 'crop'; cropId: string }
  | { type: 'research'; researchId: string }      // Chain unlocks
  | { type: 'ability'; abilityId: string }
  | { type: 'knowledge'; knowledgeId: string }
  | { type: 'generated'; generationType: string }  // Triggers LLM generation
  ;

export class ResearchRegistry {
  private static instance: ResearchRegistry;
  private research: Map<string, ResearchDefinition> = new Map();

  static getInstance(): ResearchRegistry {
    if (!this.instance) {
      this.instance = new ResearchRegistry();
    }
    return this.instance;
  }

  register(definition: ResearchDefinition): void {
    if (this.research.has(definition.id)) {
      throw new Error(`Research ${definition.id} already registered`);
    }
    this.research.set(definition.id, definition);
  }

  get(id: string): ResearchDefinition {
    const research = this.research.get(id);
    if (!research) {
      throw new Error(`Research ${id} not found`);
    }
    return research;
  }

  tryGet(id: string): ResearchDefinition | undefined {
    return this.research.get(id);
  }

  getByField(field: ResearchField): ResearchDefinition[] {
    return Array.from(this.research.values()).filter(r => r.field === field);
  }

  getByTier(tier: number): ResearchDefinition[] {
    return Array.from(this.research.values()).filter(r => r.tier === tier);
  }

  getPrerequisitesFor(id: string): ResearchDefinition[] {
    const research = this.get(id);
    return research.prerequisites.map(prereqId => this.get(prereqId));
  }

  // Procedural research registration
  registerGenerated(
    definition: ResearchDefinition,
    validation: ValidationResult
  ): void {
    if (!validation.valid) {
      throw new Error(`Cannot register invalid research: ${validation.errors.join(', ')}`);
    }
    this.register(definition);
  }

  // Tech tree traversal
  getTechTree(): TechTreeNode[] {
    // Convert flat research list into tree structure
    const nodes = new Map<string, TechTreeNode>();

    for (const research of this.research.values()) {
      nodes.set(research.id, {
        research,
        children: [],
        depth: 0
      });
    }

    // Build parent-child relationships
    for (const research of this.research.values()) {
      const node = nodes.get(research.id)!;
      for (const prereqId of research.prerequisites) {
        const parent = nodes.get(prereqId);
        if (parent) {
          parent.children.push(node);
          node.depth = Math.max(node.depth, parent.depth + 1);
        }
      }
    }

    // Return root nodes (no prerequisites)
    return Array.from(nodes.values()).filter(n => n.research.prerequisites.length === 0);
  }

  getNextAvailable(completedResearch: Set<string>): ResearchDefinition[] {
    return Array.from(this.research.values()).filter(research => {
      // Not already completed
      if (completedResearch.has(research.id)) return false;

      // All prerequisites met
      return research.prerequisites.every(prereqId => completedResearch.has(prereqId));
    });
  }
}

export interface TechTreeNode {
  research: ResearchDefinition;
  children: TechTreeNode[];
  depth: number;
}
```

---

## Part 3: Research State Component

### Per-World Tracking

```typescript
// packages/core/src/components/ResearchStateComponent.ts

export interface ResearchProgress {
  researchId: string;
  currentProgress: number;             // 0 to progressRequired
  startedAt: number;                   // Game tick
  researchers: string[];               // Agent IDs contributing
  insights: Insight[];                 // Failed experiment learnings
}

export interface Insight {
  id: string;
  content: string;                     // What was learned
  relatedMaterials: string[];          // Materials used
  breakthroughBonus: number;           // Reduces future research time
  timestamp: number;
}

export interface ResearchStateComponent extends Component {
  type: 'research_state';              // lowercase per CLAUDE.md

  // Completed research
  completed: Set<string>;
  completedAt: Map<string, number>;    // researchId -> tick

  // In-progress research
  inProgress: Map<string, ResearchProgress>;

  // Research queue (ordered)
  queue: string[];

  // Procedurally generated research available
  discoveredResearch: string[];

  // Rate limiting
  dailyDiscoveries: number;
  seasonalDiscoveries: number;
  lastDiscoveryTick: number;
}
```

---

## Part 4: Research System

### ECS System for Research Mechanics

```typescript
// packages/core/src/systems/ResearchSystem.ts

export class ResearchSystem implements System {
  readonly id = 'research';
  readonly priority = 50;
  readonly requiredComponents = ['research_state'];

  private researchRegistry: ResearchRegistry;
  private contentGenerator: ContentGenerator;
  private unlockService: UnlockQueryService;

  initialize(world: World, eventBus: EventBus): void {
    // Subscribe to relevant events
    eventBus.subscribe('building:placement:complete', this.onBuildingComplete.bind(this));
    eventBus.subscribe('crafting:completed', this.onCraftingComplete.bind(this));
    eventBus.subscribe('behavior:goal_achieved', this.onGoalAchieved.bind(this));
  }

  update(world: World, entities: Entity[], deltaTime: number): void {
    const worldEntity = this.getWorldEntity(world);
    const researchState = worldEntity.getComponent<ResearchStateComponent>('research_state');

    // Process in-progress research
    for (const [researchId, progress] of researchState.inProgress) {
      const researchers = this.getActiveResearchers(world, researchId);

      if (researchers.length === 0) {
        // No one researching this anymore
        continue;
      }

      // Advance progress based on researchers' skills
      const progressGain = this.calculateProgressGain(researchers, deltaTime);
      progress.currentProgress += progressGain;

      // Check for completion
      const definition = this.researchRegistry.get(researchId);
      if (progress.currentProgress >= definition.progressRequired) {
        this.completeResearch(researchId, worldEntity, world);
      }
    }
  }

  startResearch(agentId: string, researchId: string, world: World): void {
    const worldEntity = this.getWorldEntity(world);
    const researchState = worldEntity.getComponent<ResearchStateComponent>('research_state');

    // Check prerequisites
    const definition = this.researchRegistry.get(researchId);
    const unmetPrereqs = definition.prerequisites.filter(
      prereqId => !researchState.completed.has(prereqId)
    );
    if (unmetPrereqs.length > 0) {
      throw new Error(`Prerequisites not met: ${unmetPrereqs.join(', ')}`);
    }

    // Check required items
    if (definition.requiredItems) {
      const agent = world.getEntity(agentId);
      const inventory = agent.getComponent<InventoryComponent>('inventory');
      for (const itemStack of definition.requiredItems) {
        const available = inventory.slots
          .filter(s => s.itemId === itemStack.itemId)
          .reduce((sum, s) => sum + s.quantity, 0);

        if (available < itemStack.quantity) {
          throw new Error(`Missing required item: ${itemStack.itemId} x${itemStack.quantity}`);
        }
      }

      // Consume items
      for (const itemStack of definition.requiredItems) {
        inventory.removeItem(itemStack.itemId, itemStack.quantity);
      }
    }

    // Start research
    researchState.inProgress.set(researchId, {
      researchId,
      currentProgress: 0,
      startedAt: world.tick,
      researchers: [agentId],
      insights: []
    });

    world.eventBus.emit({
      type: 'research:started',
      source: agentId,
      data: { researchId, researchName: definition.name }
    });
  }

  private completeResearch(
    researchId: string,
    worldEntity: Entity,
    world: World
  ): void {
    const researchState = worldEntity.getComponent<ResearchStateComponent>('research_state');
    const definition = this.researchRegistry.get(researchId);

    // Mark complete
    researchState.completed.add(researchId);
    researchState.completedAt.set(researchId, world.tick);
    researchState.inProgress.delete(researchId);

    // Process unlocks
    for (const unlock of definition.unlocks) {
      this.processUnlock(unlock, world);
    }

    // Emit completion event
    world.eventBus.emit({
      type: 'research:completed',
      data: {
        researchId,
        researchName: definition.name,
        field: definition.field
      }
    });

    // Award XP to all researchers
    const progress = researchState.inProgress.get(researchId);
    if (progress) {
      for (const researcherId of progress.researchers) {
        world.eventBus.emit({
          type: 'skills:xp_gained',
          source: researcherId,
          data: {
            skill: 'research',
            amount: 100 * definition.tier,
            reason: 'research_completed'
          }
        });
      }
    }
  }

  private processUnlock(unlock: ResearchUnlock, world: World): void {
    switch (unlock.type) {
      case 'recipe': {
        // Recipe is now unlocked (checked via UnlockQueryService)
        world.eventBus.emit({
          type: 'research:unlocked',
          data: { type: 'recipe', id: unlock.recipeId }
        });
        break;
      }

      case 'building': {
        world.eventBus.emit({
          type: 'research:unlocked',
          data: { type: 'building', id: unlock.buildingId }
        });
        break;
      }

      case 'research': {
        // Chain unlock: make new research available
        const worldEntity = this.getWorldEntity(world);
        const researchState = worldEntity.getComponent<ResearchStateComponent>('research_state');
        researchState.discoveredResearch.push(unlock.researchId);
        break;
      }

      case 'generated': {
        // Trigger procedural generation
        this.generateContent(unlock.generationType, world);
        break;
      }

      // Handle other unlock types...
    }
  }

  conductExperiment(
    agent: Entity,
    materials: ItemStack[],
    world: World
  ): ExperimentResult {
    // Agent tries to invent something new
    const context = this.buildGenerationContext(agent, materials, world);
    const generated = this.contentGenerator.generateDiscovery(context);

    if (generated.valid) {
      // Register the new content
      this.contentGenerator.registerContent(generated.content);

      world.eventBus.emit({
        type: 'discovery:created',
        source: agent.id,
        data: {
          contentType: generated.content.type,
          contentId: generated.content.id,
          contentName: generated.content.name
        }
      });

      return {
        success: true,
        discovery: generated.content
      };
    } else {
      // Failed, but gained insight
      const insight: Insight = {
        id: `insight_${Date.now()}`,
        content: generated.insight || 'The experiment failed, but I learned something...',
        relatedMaterials: materials.map(m => m.itemId),
        breakthroughBonus: 0.1,  // 10% faster future research
        timestamp: world.tick
      };

      return {
        success: false,
        insight
      };
    }
  }

  private getWorldEntity(world: World): Entity {
    const entities = world.query().with('research_state').executeEntities();
    if (entities.length === 0) {
      throw new Error('No world entity with research_state component found');
    }
    return entities[0];
  }

  private getActiveResearchers(world: World, researchId: string): Entity[] {
    // Find agents currently researching this
    return world.query()
      .with('agent')
      .with('position')
      .executeEntities()
      .filter(entity => {
        const agent = entity.getComponent<AgentComponent>('agent');
        return agent.behavior === 'research' && agent.behaviorState?.researchId === researchId;
      });
  }

  private calculateProgressGain(researchers: Entity[], deltaTime: number): number {
    let totalGain = 0;
    for (const researcher of researchers) {
      const skills = researcher.getComponent<SkillsComponent>('skills');
      const researchSkill = skills?.skills.get('research');
      const skillMultiplier = 1 + (researchSkill?.level || 0) * 0.1;
      totalGain += 1 * skillMultiplier * deltaTime;
    }
    return totalGain;
  }

  private buildGenerationContext(
    agent: Entity,
    materials: ItemStack[],
    world: World
  ): GenerationContext {
    // Build context for LLM content generation
    // Implementation details omitted for brevity
    return {} as GenerationContext;
  }

  private generateContent(generationType: string, world: World): void {
    // Trigger procedural content generation
    // Implementation details omitted for brevity
  }
}

export interface ExperimentResult {
  success: boolean;
  discovery?: GeneratedContent;
  insight?: Insight;
}
```

---

## Part 5: Unlock Query Service

### Central Service for Checking Unlocks

```typescript
// packages/core/src/research/UnlockQueryService.ts

export class UnlockQueryService {
  constructor(
    private researchState: ResearchStateComponent,
    private researchRegistry: ResearchRegistry,
    private itemRegistry: ItemRegistry,
    private recipeRegistry: RecipeRegistry,
    private buildingRegistry: BuildingBlueprintRegistry
  ) {}

  // Research state queries
  isResearchCompleted(researchId: string): boolean {
    return this.researchState.completed.has(researchId);
  }

  isResearchAvailable(researchId: string): boolean {
    const definition = this.researchRegistry.get(researchId);
    return definition.prerequisites.every(prereqId =>
      this.isResearchCompleted(prereqId)
    );
  }

  getCompletedResearch(): string[] {
    return Array.from(this.researchState.completed);
  }

  // Content unlock queries
  isRecipeUnlocked(recipeId: string): boolean {
    const recipe = this.recipeRegistry.getRecipe(recipeId);
    if (!recipe.researchRequirements || recipe.researchRequirements.length === 0) {
      return true;  // No requirements = always unlocked
    }
    return recipe.researchRequirements.every(req =>
      this.isResearchCompleted(req)
    );
  }

  isBuildingUnlocked(buildingId: string): boolean {
    const blueprint = this.buildingRegistry.get(buildingId);
    if (!blueprint.techRequired || blueprint.techRequired.length === 0) {
      return true;  // No requirements = always unlocked
    }
    return blueprint.techRequired.every(req =>
      this.isResearchCompleted(req)
    );
  }

  isItemUnlocked(itemId: string): boolean {
    // Items are unlocked if they can be crafted or are starting items
    // Check if any recipe that produces this item is unlocked
    const recipes = this.recipeRegistry.getRecipesProducing(itemId);
    return recipes.some(recipe => this.isRecipeUnlocked(recipe.id));
  }

  // Filtered queries
  getUnlockedRecipes(): Recipe[] {
    const allRecipes = this.recipeRegistry.getAllRecipes();
    return allRecipes.filter(recipe => this.isRecipeUnlocked(recipe.id));
  }

  getUnlockedBuildings(): BuildingBlueprint[] {
    const allBuildings = this.buildingRegistry.getAll();
    return allBuildings.filter(building => this.isBuildingUnlocked(building.id));
  }

  getAvailableResearch(): ResearchDefinition[] {
    return this.researchRegistry.getNextAvailable(this.researchState.completed);
  }

  // For UI
  getUnlockProgress(contentId: string, contentType: ContentType): UnlockProgress {
    switch (contentType) {
      case 'recipe': {
        const recipe = this.recipeRegistry.getRecipe(contentId);
        const requirements = recipe.researchRequirements || [];
        const completed = requirements.filter(req => this.isResearchCompleted(req));
        return {
          total: requirements.length,
          completed: completed.length,
          remaining: requirements.filter(req => !this.isResearchCompleted(req))
        };
      }

      case 'building': {
        const building = this.buildingRegistry.get(contentId);
        const requirements = building.techRequired || [];
        const completed = requirements.filter(req => this.isResearchCompleted(req));
        return {
          total: requirements.length,
          completed: completed.length,
          remaining: requirements.filter(req => !this.isResearchCompleted(req))
        };
      }

      default:
        return { total: 0, completed: 0, remaining: [] };
    }
  }
}

export type ContentType = 'recipe' | 'building' | 'item' | 'research';

export interface UnlockProgress {
  total: number;
  completed: number;
  remaining: string[];
}
```

---

## Part 6: Content Generator

### LLM Integration for Procedural Content

```typescript
// packages/core/src/research/ContentGenerator.ts

export interface GenerationContext {
  researcher: {
    name: string;
    personality: PersonalityTraits;
    skills: SkillSet;
    specialization: ResearchField;
  };
  materials: {
    items: ItemDefinition[];
    quantities: number[];
    totalTier: number;
  };
  constraints: GenerationConstraints;
  existingContent: {
    items: string[];
    recipes: string[];
    buildings: string[];
  };
}

export interface GenerationConstraints {
  maxTier: number;
  powerBudget: number;
  allowedOutputTypes: ContentType[];
  fieldFocus: ResearchField;
  mustDifferFrom: string[];           // Deduplication
}

export class ContentGenerator {
  constructor(
    private llmProvider: LLMProvider,
    private promptBuilder: StructuredPromptBuilder,
    private validator: ContentValidator
  ) {}

  async generateItem(context: GenerationContext): Promise<GeneratedItem> {
    const prompt = this.promptBuilder.buildItemGenerationPrompt(context);
    const response = await this.llmProvider.generate(prompt);
    const item = this.parseItemResponse(response);

    const validation = this.validator.validateItem(item, context.constraints);
    if (!validation.valid) {
      throw new Error(`Generated item invalid: ${validation.errors.join(', ')}`);
    }

    return item;
  }

  async generateRecipe(context: GenerationContext): Promise<GeneratedRecipe> {
    const prompt = this.promptBuilder.buildRecipeGenerationPrompt(context);
    const response = await this.llmProvider.generate(prompt);
    const recipe = this.parseRecipeResponse(response);

    const validation = this.validator.validateRecipe(recipe);
    if (!validation.valid) {
      throw new Error(`Generated recipe invalid: ${validation.errors.join(', ')}`);
    }

    return recipe;
  }

  async generateResearch(context: GenerationContext): Promise<GeneratedResearch> {
    const prompt = this.promptBuilder.buildResearchGenerationPrompt(context);
    const response = await this.llmProvider.generate(prompt);
    const research = this.parseResearchResponse(response);

    const validation = this.validator.validateResearch(research);
    if (!validation.valid) {
      throw new Error(`Generated research invalid: ${validation.errors.join(', ')}`);
    }

    return research;
  }

  registerContent(content: GeneratedContent): void {
    switch (content.type) {
      case 'item': {
        const itemRegistry = ItemRegistry.getInstance();
        itemRegistry.register(content as ItemDefinition);
        break;
      }

      case 'recipe': {
        const recipeRegistry = RecipeRegistry.getInstance();
        recipeRegistry.registerRecipe(content as Recipe);
        break;
      }

      case 'research': {
        const researchRegistry = ResearchRegistry.getInstance();
        researchRegistry.registerGenerated(content as ResearchDefinition, { valid: true, errors: [] });
        break;
      }

      default:
        throw new Error(`Unknown content type: ${(content as any).type}`);
    }
  }

  private parseItemResponse(response: string): GeneratedItem {
    // Parse LLM response into ItemDefinition
    // Implementation omitted for brevity
    return {} as GeneratedItem;
  }

  private parseRecipeResponse(response: string): GeneratedRecipe {
    // Parse LLM response into Recipe
    // Implementation omitted for brevity
    return {} as GeneratedRecipe;
  }

  private parseResearchResponse(response: string): GeneratedResearch {
    // Parse LLM response into ResearchDefinition
    // Implementation omitted for brevity
    return {} as GeneratedResearch;
  }
}

export type GeneratedContent = GeneratedItem | GeneratedRecipe | GeneratedResearch;

export interface GeneratedItem extends ItemDefinition {
  generatedBy: string;
  generationContext: GenerationContext;
}

export interface GeneratedRecipe extends Recipe {
  generatedBy: string;
  generationContext: GenerationContext;
}

export interface GeneratedResearch extends ResearchDefinition {
  generatedBy: string;
  generationContext: GenerationContext;
}
```

---

## Part 7: Content Validator

### Balance Enforcement

```typescript
// packages/core/src/research/ContentValidator.ts

export class ContentValidator {
  validateItem(
    item: GeneratedItem,
    constraints: GenerationConstraints
  ): ValidationResult {
    const errors: string[] = [];

    // Tier consistency
    if (item.tier > constraints.maxTier + 1) {
      errors.push(`Item tier ${item.tier} exceeds max ${constraints.maxTier + 1}`);
    }

    // Power budget
    const power = this.calculateItemPower(item);
    if (power > constraints.powerBudget) {
      errors.push(`Item power ${power} exceeds budget ${constraints.powerBudget}`);
    }

    // Deduplication
    if (this.isTooSimilar(item, constraints.mustDifferFrom)) {
      errors.push('Item too similar to existing content');
    }

    return { valid: errors.length === 0, errors };
  }

  validateRecipe(recipe: GeneratedRecipe): ValidationResult {
    const errors: string[] = [];

    // Recipe value balance: output >= sum(inputs) * 1.2
    const inputValue = this.calculateRecipeInputValue(recipe);
    const outputValue = this.calculateRecipeOutputValue(recipe);

    if (outputValue < inputValue * 1.2) {
      errors.push('Recipe output value too low compared to inputs');
    }

    // No circular dependencies
    if (this.hasCircularDependency(recipe)) {
      errors.push('Recipe creates circular dependency');
    }

    // All ingredients obtainable
    for (const ingredient of recipe.inputs) {
      if (!this.isObtainable(ingredient.itemId)) {
        errors.push(`Ingredient ${ingredient.itemId} is not obtainable`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  validateResearch(research: GeneratedResearch): ValidationResult {
    const errors: string[] = [];

    // Tier consistency with prerequisites
    for (const prereqId of research.prerequisites) {
      const prereq = ResearchRegistry.getInstance().tryGet(prereqId);
      if (prereq && prereq.tier >= research.tier) {
        errors.push(`Research tier ${research.tier} must be higher than prerequisite tier ${prereq.tier}`);
      }
    }

    // Reasonable progress requirement
    const expectedProgress = research.tier * 100;
    if (research.progressRequired > expectedProgress * 2) {
      errors.push(`Progress requirement ${research.progressRequired} is too high for tier ${research.tier}`);
    }

    return { valid: errors.length === 0, errors };
  }

  private calculateItemPower(item: ItemDefinition): number {
    // Heuristic: sum of all numeric properties
    let power = 0;
    if (item.nutrition) power += item.nutrition;
    if (item.healAmount) power += item.healAmount * 10;
    if (item.temperature) power += Math.abs(item.temperature);
    // Add more properties as needed
    return power;
  }

  private isTooSimilar(item: ItemDefinition, existingIds: string[]): boolean {
    // Check name similarity, properties similarity
    // Simple version: check if name is substring of any existing
    for (const existingId of existingIds) {
      const existing = ItemRegistry.getInstance().tryGet(existingId);
      if (existing && this.nameSimilarity(item.name, existing.name) > 0.8) {
        return true;
      }
    }
    return false;
  }

  private nameSimilarity(name1: string, name2: string): number {
    // Levenshtein distance or similar
    // Simplified: just check substring
    const n1 = name1.toLowerCase();
    const n2 = name2.toLowerCase();
    if (n1.includes(n2) || n2.includes(n1)) return 1.0;
    return 0.0;
  }

  private calculateRecipeInputValue(recipe: Recipe): number {
    let total = 0;
    for (const input of recipe.inputs) {
      const item = ItemRegistry.getInstance().get(input.itemId);
      total += item.tier * input.quantity;
    }
    return total;
  }

  private calculateRecipeOutputValue(recipe: Recipe): number {
    const output = ItemRegistry.getInstance().get(recipe.outputItemId);
    return output.tier * recipe.outputQuantity;
  }

  private hasCircularDependency(recipe: Recipe): boolean {
    // Check if output is used as input (direct circular)
    return recipe.inputs.some(input => input.itemId === recipe.outputItemId);
  }

  private isObtainable(itemId: string): boolean {
    const item = ItemRegistry.getInstance().tryGet(itemId);
    if (!item) return false;

    // Check if it's a starting item or has a recipe
    if (item.category === 'natural_resource') return true;

    const recipes = RecipeRegistry.getInstance().getRecipesProducing(itemId);
    return recipes.length > 0;
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

---

## Dependencies & Integration

### Depends On (Prerequisites)
These systems must be implemented before this spec:
- **LLM Provider** - For procedural content generation
- **Item Registry** - Items that can be unlocked through research
- **Building Registry** - Buildings that can be unlocked through research
- **Recipe Registry** - Recipes that can be unlocked through research

### Integrates With (Parallel Systems)
These systems work alongside this spec:
- **All Content Systems** - Items, buildings, recipes all integrate with research unlocks
- **Magic Skill Trees** - Some magic abilities unlock through research discoveries

### Enables (Dependent Systems)
These systems build on top of this spec:
- **Procedural Content Generation** - LLM-generated items, recipes, and buildings
- **Capability Gap Detection** - System identifies when agents want unsupported features
- **Tech Tree Progression** - Structured advancement through technological eras

---

## Implementation Checklist

### Phase 1: Foundation (Non-Breaking) ✅ COMPLETE
- [x] Create `ResearchRegistry` with core types
- [x] Create `ResearchDefinition` interface
- [x] Create `ResearchUnlock` discriminated union
- [x] Create `ResearchStateComponent` ECS component (ResearchComponent)
- [x] Add `research:*` events to `EventMap.ts`
- [x] Write unit tests for registry

**Dependencies:** None
**Integration Points:** Event system
**Status:** ✅ Complete (2025-12-29)

### Phase 2: System Integration ✅ COMPLETE
- [x] Create `ResearchSystem` ECS system
- [x] Implement `startResearch()` and `completeResearch()`
- [x] Implement progress tracking
- [x] Create `UnlockQueryService` class (implemented in ResearchSystem)
- [x] Implement unlock checking methods
- [x] Update `BuildingBlueprintRegistry` with research buildings
- [x] Update `StructuredPromptBuilder` with research context
- [x] Write integration tests

**Dependencies:** Phase 1 ✅
**Integration Points:** All registries, UI systems
**Status:** ✅ Complete (2025-12-29)
**Implementation:** `packages/core/src/systems/ResearchSystem.ts`, `packages/core/src/components/ResearchComponent.ts`

### Phase 3: Procedural Content
- [ ] Create `ContentGenerator` class
- [ ] Implement `generateItem()`, `generateRecipe()`, `generateResearch()`
- [ ] Create `ContentValidator` class
- [ ] Implement validation rules
- [ ] Create generation prompts
- [ ] Add experimental research definitions
- [ ] Write generation tests

**Dependencies:** Phase 2
**Integration Points:** LLM provider, all registries

### Phase 4: Capability Evolution
- [ ] Create `CapabilityGapDetector` class
- [ ] Detect unsupported actions in agent behavior
- [ ] Create `CapabilityRequestQueue` for human review
- [ ] Integrate with research system (gaps trigger research)
- [ ] Add CLI/dashboard for reviewing gaps
- [ ] Write detection tests

**Dependencies:** Phase 3
**Integration Points:** Agent decision system, research system

### Phase 5: Default Tech Tree
- [ ] Create Tier 1 research (fundamentals)
- [ ] Create Tier 2 research (expansion)
- [ ] Create Tier 3 research (advancement)
- [ ] Create Tier 4 research (mastery)
- [ ] Create Tier 5 research (transcendence)
- [ ] Link research to existing recipes/buildings
- [ ] Write tech tree tests

**Dependencies:** Phase 1
**Integration Points:** All content registries

### Phase 6: UI Integration
- [ ] Update `BuildingPlacementUI` to use `UnlockQueryService`
- [ ] Update `CraftingPanelUI` to use `UnlockQueryService`
- [ ] Add research progress visualization
- [ ] Add unlock notifications
- [ ] Create research selection UI
- [ ] Write UI tests

**Dependencies:** Phase 2
**Integration Points:** Renderer, UI systems

### Phase 7: Save/Load Integration
- [ ] Add `ResearchStateComponent` to serialization
- [ ] Create save/load tests
- [ ] Test backward compatibility
- [ ] Migration script for old saves

**Dependencies:** All previous phases
**Integration Points:** Save/load system

---

## Research Questions

1. **Research progress persistence?**
   - **Proposal:** Yes, persist. More realistic and prevents re-research on reload.

2. **Multi-agent research credit?**
   - **Proposal:** All contributors get XP. Speed has diminishing returns (2 agents = 1.5x speed, not 2x).

3. **Procedural content rate limiting?**
   - **Proposal:** 1 discovery per agent per day, max 3-5 globally per day. Prevents content spam.

4. **Capability gap UI?**
   - **Proposal:** External web dashboard. In-game admin panel is too complex for MVP.

5. **Can research be "lost" (e.g., civilization collapse)?**
   - **Proposal:** No. Once discovered, always known. Could add "knowledge preservation" buildings later.

6. **Research buildings required?**
   - **Proposal:** Tier 1-2 = no building required. Tier 3+ = require lab/workshop.

7. **Failed research?**
   - **Proposal:** Research always succeeds eventually, but failed experiments give insights (progress bonus for future research).

---

## Default Tech Tree (Tier 1-5)

### Tier 1 - Fundamentals (No Prerequisites)
- `agriculture_i` → Unlocks basic seeds, tilling
- `construction_i` → Unlocks workbench, basic buildings
- `crafting_i` → Unlocks basic recipes, stone tools

### Tier 2 - Expansion (Requires Tier 1)
- `agriculture_ii` → Sprinklers, fertilizers
- `metallurgy_i` → Forge, iron working, iron tools
- `textiles_i` → Cloth, basic clothing
- `cuisine_i` → Cooking, food preservation

### Tier 3 - Advancement (Requires Tier 2)
- `agriculture_iii` → Greenhouse, crop hybrids
- `metallurgy_ii` → Steel, advanced alloys
- `alchemy_i` → Potions, transformations
- `machinery_i` → Windmills, water wheels

### Tier 4 - Mastery (Requires Tier 3)
- `agriculture_iv` → Legendary crops
- `metallurgy_iii` → Legendary metals
- `society_i` → Advanced trading

### Tier 5 - Transcendence (Requires Tier 4)
- `experimental_research` → Unlocks procedural invention
- `arcane_studies` → Magical items
- `master_architecture` → Unique buildings

---

## Files to Create

1. `packages/core/src/research/ResearchRegistry.ts`
2. `packages/core/src/research/UnlockQueryService.ts`
3. `packages/core/src/research/ContentGenerator.ts`
4. `packages/core/src/research/ContentValidator.ts`
5. `packages/core/src/research/CapabilityGapDetector.ts`
6. `packages/core/src/research/types.ts`
7. `packages/core/src/research/defaultResearch.ts`
8. `packages/core/src/research/index.ts`
9. `packages/core/src/components/ResearchStateComponent.ts`
10. `packages/core/src/systems/ResearchSystem.ts`
11. `packages/core/src/research/__tests__/ResearchRegistry.test.ts`
12. `packages/core/src/research/__tests__/UnlockQueryService.test.ts`
13. `packages/core/src/research/__tests__/ContentValidator.test.ts`

## Files to Modify

1. `packages/core/src/events/EventMap.ts` - Add research events
2. `packages/renderer/src/BuildingPlacementUI.ts` - Use `UnlockQueryService`
3. `packages/renderer/src/CraftingPanelUI.ts` - Use `UnlockQueryService`
4. `packages/core/src/world/World.ts` - Initialize `ResearchStateComponent`
5. `packages/core/src/persistence/SaveLoadService.ts` - Serialize research state

---

## Success Criteria

✅ Research unlocks recipes, buildings, items across all registries
✅ Tech tree has dependencies (prerequisites)
✅ Research progress tracked per-world (save/load works)
✅ `UnlockQueryService` provides single source of truth for "is X unlocked?"
✅ UI filters content based on research state
✅ Events emitted for research completion and unlocks
✅ Procedural content generation works with validation
✅ All tests pass

---

## Inspiration

This system draws from:
- **Civilization series** - The tech tree that defined strategy games
- **Oxygen Not Included** - Research-driven progression and discovery
- **Dwarf Fortress** - Procedural content and emergent knowledge
- **Factorio** - Tech dependencies and automation unlocks
