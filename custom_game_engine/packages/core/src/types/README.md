# Core Types

Centralized type definitions shared across the engine. Breaks circular dependencies between packages by defining interfaces and enums in a neutral location.

## Key Categories

### Component Types
**`ComponentType.ts`** - 125+ component type enum. Use instead of string literals:
```typescript
entity.hasComponent(ComponentType.Agent)
entity.getComponent(ComponentType.Memory)
```
Convention: `lowercase_with_underscores` (follows CLAUDE.md).

### LLM Integration
**`LLMTypes.ts`** - Provider interfaces, scheduler contracts, decision layers. Breaks circular dependency between `@ai-village/core` and `@ai-village/llm`.

Key interfaces: `LLMProvider`, `LLMScheduler`, `LLMDecisionQueue`, `LLMResponse`, `ProviderPricing`

### Domain Types
**Behavior** (`BehaviorTypes.ts`): `IdleBehaviorType`, `SteeringBehavior`, `CraftPhase`, `ExplorationMode`, `DecisionSource`

**Buildings** (`BuildingType.ts`): Single-tile furniture/workstations enum. Multi-tile buildings use `TileBasedBlueprint`.

**Items** (`ItemTypes.ts`): `ItemQuality`, `ItemRarity`, `RecipeCategory`, `CraftingJobStatus`

**Terrain** (`TerrainTypes.ts`): `TerrainType`, `BiomeType`, `TerrainFeatureType`, `TerrainFeature` interface, `TerrainAnalyzer` interface

**System** (`SystemTypes.ts`): `GameLoopState`, `RenderLayer`, `EventPriority`, `ConnectionState`, `MaterialTexture`

### Specialized Types
**Animals** (`AnimalTypes.ts`), **Combat** (`CombatTypes.ts`), **Governance** (`GovernanceTypes.ts`), **Navigation** (`NavigationTypes.ts`), **Research** (`ResearchTypes.ts`), **Resources** (`ResourceTypes.ts`), **Social** (`SocialTypes.ts`), **Weather** (`WeatherTypes.ts`)

**Botany**: `PlantSpecies.ts` (40+ plant species), `PlantDisease.ts` (disease definitions)

## Usage

```typescript
import { ComponentType, BuildingType, LLMProvider, TerrainType } from '@ai-village/core';
```

All enums and types are re-exported through package `index.ts`.

## Architecture

Types defined here enable:
- **Dependency breaking**: Core references interfaces, packages implement
- **Type safety**: Enums prevent string typos
- **Shared vocabulary**: Consistent types across 15+ packages
- **Structural typing**: Interfaces allow runtime injection without imports
