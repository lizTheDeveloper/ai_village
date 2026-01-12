# Research System

Technology research and discovery system with predefined tech trees and procedural content generation.

## Overview

**Phase 13: Research & Discovery** - Agents unlock recipes, buildings, items, and abilities through research projects. Supports:

- **Predefined Tech Tree**: 5-tier progression (fundamentals → transcendence) + Clarketech (tier 6-8)
- **Procedural Research**: Agents generate research via `LLMTechnologyGenerator`
- **Academic Publishing**: Papers, citations, inventor fame, chronicler system
- **Unlock Management**: Gate content behind research prerequisites

## Core Components

### ResearchRegistry

Singleton registry for research definitions. Similar to `ItemRegistry`.

```typescript
import { ResearchRegistry, registerDefaultResearch } from './research';

registerDefaultResearch();  // Load tech tree
const registry = ResearchRegistry.getInstance();

const research = registry.get('metallurgy_i');
const available = registry.getNextAvailable(completedSet);
```

### UnlockQueryService

Check unlock status without modifying registries.

```typescript
import { UnlockQueryService } from './research';

const service = new UnlockQueryService(researchState, registry);
if (service.isRecipeUnlocked(['metallurgy_i'])) {
  // Show iron recipes
}
```

### ResearchDefinition

```typescript
interface ResearchDefinition {
  id: string;
  name: string;
  description: string;
  field: ResearchField;           // 'agriculture', 'metallurgy', etc.
  tier: number;                    // 1-5 (predefined), 6-8 (Clarketech)
  progressRequired: number;        // Points to complete
  prerequisites: string[];         // Research IDs required first
  unlocks: ResearchUnlock[];       // Recipes, buildings, items, abilities
  type: 'predefined' | 'generated' | 'experimental';
  requiredItems?: MaterialRequirement[];
  requiredBuilding?: string;
  generationContext?: GenerationContext;  // For procedural research
}
```

### Research Fields

13 domains: `agriculture`, `construction`, `crafting`, `metallurgy`, `alchemy`, `textiles`, `cuisine`, `machinery`, `nature`, `society`, `arcane`, `experimental`, `genetics`

## Tech Tree Structure

**Tier 1**: Fundamentals (no prerequisites)
- `agriculture_i`, `construction_i`, `crafting_i`, `nature_i`, `pictographic_writing`

**Tier 2**: Expansion (requires Tier 1)
- `agriculture_ii`, `metallurgy_i`, `textiles_i`, `ideographic_writing`

**Tier 3**: Specialization (requires Tier 2)
- `alchemy_i`, `machinery_i`, `genetics_i`, `alphabet_writing`

**Tier 4**: Mastery (requires Tier 3)
- `metallurgy_iii`, `alchemy_ii`, `printing_press`, `mass_literacy`

**Tier 5**: Transcendence (requires Tier 4)
- `genetics_iii`, `arcane_i`, `experimental_i`

**Tier 6-8**: Clarketech (requires Tier 5)
- Advanced/impossible technologies via `clarketechResearch.ts`

## Research Progression

```typescript
// 1. Check prerequisites
if (registry.canStart('metallurgy_i', completedSet)) {
  // 2. Start research (consume materials)
  researchState.inProgress.set('metallurgy_i', {
    researchId: 'metallurgy_i',
    currentProgress: 0,
    startedAt: world.tick,
    researchers: [agentId],
    insights: []
  });
}

// 3. Accumulate progress (via ResearchSystem)
progress.currentProgress += researchPoints;

// 4. Complete when progress >= progressRequired
if (progress.currentProgress >= definition.progressRequired) {
  researchState.completed.add('metallurgy_i');
  researchState.inProgress.delete('metallurgy_i');
  // Apply unlocks
}
```

## Unlock Types

```typescript
type ResearchUnlock =
  | { type: 'recipe'; recipeId: string }
  | { type: 'building'; buildingId: string }
  | { type: 'item'; itemId: string }
  | { type: 'crop'; cropId: string }
  | { type: 'research'; researchId: string }
  | { type: 'ability'; abilityId: string }
  | { type: 'knowledge'; knowledgeId: string }
  | { type: 'generated'; generationType: string };
```

## Academic Publishing

**AcademicPaperSystem**: Authors publish papers, gain citations, build reputation.

**InventorFameSystem**: Track discoveries, grant titles (Novice → Legendary), generate news.

**PublicationSystem**: Technology-gated publishing (`WritingTechLevel`): pictographic → ideographic → alphabetic → printing press.

**HerbalistDiscoverySystem**: Herbalists publish botanical papers on plant discoveries.

**CookInfluencerSystem**: Cooks publish recipes as cookbooks.

**ChroniclerSystem**: Chroniclers record historical events as chronicles.

## Procedural Research

```typescript
import { llmTechnologyGenerator } from './research';

const result = await llmTechnologyGenerator.generateTechnology({
  researcherId: agentId,
  fieldFocus: 'metallurgy',
  availableMaterials: ['iron_ore', 'coal'],
  completedResearch: completedSet,
  constraints: { maxTier: 3, powerBudget: 100 }
});

if (result.success && result.research) {
  registry.registerGenerated(result.research, result.validation);
}
```

## Files

**Core**: `ResearchRegistry.ts`, `UnlockQueryService.ts`, `types.ts`

**Data**: `defaultResearch.ts` (tiers 1-5), `clarketechResearch.ts` (tiers 6-8)

**Publishing**: `AcademicPaperSystem.ts`, `InventorFameSystem.ts`, `PublicationSystem.ts`

**Specialists**: `HerbalistDiscoverySystem.ts`, `CookInfluencerSystem.ts`, `ChroniclerSystem.ts`

**Generation**: `LLMTechnologyGenerator.ts`

**Tests**: `__tests__/ResearchRegistry.test.ts`, `ResearchFlow.integration.test.ts`
