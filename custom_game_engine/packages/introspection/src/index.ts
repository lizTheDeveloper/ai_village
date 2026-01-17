/**
 * @packageDocumentation
 * @module @ai-village/introspection
 *
 * Schema-Driven Component Metadata System
 *
 * This package provides a comprehensive introspection system that allows the game engine
 * to define, validate, mutate, and render component data across multiple contexts (player UI,
 * LLM prompts, agent self-awareness, dev tools).
 *
 * ## Core Concepts
 *
 * **Single source of truth**: Define component structure once in a schema, use everywhere.
 * Components defined with {@link defineComponent} specify field types, visibility, UI hints,
 * LLM prompt configuration, and mutation rules. These schemas power automatic UI generation,
 * LLM prompt construction, validation, and developer tools.
 *
 * ## Architecture Overview
 *
 * ### Type System
 * Complete metadata layer for components:
 * - {@link ComponentSchema} - Full component metadata definition
 * - {@link FieldSchema} - Field-level metadata (type, constraints, visibility)
 * - {@link FieldType} - Field types (string, number, boolean, enum, array, map, object)
 * - {@link Visibility} - Multi-context visibility flags (player, llm, agent, user, dev)
 * - {@link UIHints} - Widget types and rendering hints
 * - {@link ComponentCategory} - Logical grouping (agent, physical, social, cognitive, magic, etc.)
 * - {@link MutabilityTypes} - Mutation permissions
 * - {@link LLMConfig} - LLM prompt generation configuration
 * - {@link WidgetType} - UI widget types (text, slider, checkbox, dropdown, json, readonly)
 *
 * ### Core Functionality
 * Schema definition and validation:
 * - {@link defineComponent} - Type-safe schema definition helper
 * - {@link validateSchema} - Runtime schema validation
 * - {@link assertValidSchema} - Validation with exception on failure
 *
 * ### Registry System
 * Centralized schema storage and retrieval:
 * - {@link ComponentRegistry} - Singleton registry for all component schemas
 * - {@link autoRegister} - Auto-registers schemas on import
 *
 * ### Mutation System
 * Validated, reversible component mutations:
 * - {@link MutationService} - Central mutation service with validation and undo/redo
 * - {@link ValidationService} - Field-level validation (type, range, enum, required)
 * - {@link UndoStack} - Command pattern undo/redo stack
 * - {@link MutationEvent} - Mutation event types for observers
 *
 * ### Rendering System
 * Multi-context rendering from schemas:
 * - {@link PromptRenderer} - LLM prompt generation from schemas
 * - {@link AgentPromptRenderer} - Agent-specific prompt rendering
 * - {@link DevRenderer} - Canvas-based dev UI auto-generation
 * - {@link CachedDevRenderer} - Cached dev renderer with scheduler integration
 * - {@link PlayerRenderer} - Abstract player UI renderer
 * - {@link PlayerCanvasRenderer} - Canvas player UI implementation
 * - {@link PlayerDOMRenderer} - DOM player UI implementation
 * - {@link WidgetFactory} - UI widget creation
 *
 * ### Render Caching
 * Scheduler-aware performance optimization:
 * - {@link RenderCache} - Scheduler-based render caching (85-99% hit rate)
 * - {@link CacheMetrics} - Cache statistics and performance tracking
 *
 * ## Component Categories
 *
 * The system organizes 125+ component schemas into 9 categories:
 * - **core**: Fundamental components (identity, position, sprite)
 * - **agent**: Agent-specific (personality, skills, needs, mood)
 * - **physical**: Physical attributes (health, inventory, equipment, body)
 * - **social**: Social systems (relationships, reputation, economy, conflict)
 * - **cognitive**: Cognitive systems (memory, goals, beliefs, knowledge)
 * - **magic**: Magic systems (mana, spells, paradigms, divinity, lore)
 * - **world**: World systems (time, weather, buildings, terrain, realms)
 * - **system**: Internal systems (steering, pathfinding, vision, debug)
 * - **afterlife**: Spiritual systems (death, judgment, bargains, reincarnation)
 *
 * ## Key Features
 *
 * **Multi-context visibility** - Same schema, different views:
 * - `visibility.player` → Player-facing UI
 * - `visibility.llm` → LLM prompts (detailed or summarized)
 * - `visibility.agent` → Agent self-awareness
 * - `visibility.user` → User settings UI
 * - `visibility.dev` → Developer debug tools
 *
 * **Progressive field reveal** - Fields shown based on context:
 * - LLM sees high-priority fields first, can use summarization for complex data
 * - Player UI hides internal state, shows gameplay-relevant info
 * - Dev tools show everything with full editing capabilities
 *
 * **Scheduler-based caching** - Reduces redundant renders by 85-99%:
 * - Cache expires based on system update intervals (from SimulationScheduler)
 * - Agent components: 67% hit rate (updates every tick)
 * - Plant components: 99.7% hit rate (updates every 86400 ticks)
 * - Auto-invalidation on mutations via MutationService integration
 *
 * **Validated mutations** with undo/redo:
 * - Type checking, range validation, enum validation
 * - Custom mutators for complex logic
 * - Automatic cache invalidation
 * - Event emission for observers
 *
 * ## Usage Example
 *
 * ```typescript
 * import {
 *   defineComponent,
 *   autoRegister,
 *   ComponentRegistry,
 *   MutationService,
 *   PromptRenderer,
 *   type Component
 * } from '@ai-village/introspection';
 *
 * // Define component type
 * interface NeedsComponent extends Component {
 *   type: 'needs';
 *   version: 1;
 *   hunger: number;
 *   thirst: number;
 *   energy: number;
 * }
 *
 * // Create schema with auto-registration
 * export const NeedsSchema = autoRegister(
 *   defineComponent<NeedsComponent>({
 *     type: 'needs',
 *     version: 1,
 *     category: 'agent',
 *     description: 'Agent survival needs',
 *     fields: {
 *       hunger: {
 *         type: 'number',
 *         required: true,
 *         range: [0, 100],
 *         description: 'Hunger level',
 *         visibility: { player: true, llm: true, agent: true, user: false, dev: true },
 *         ui: { widget: 'slider', group: 'survival', order: 1 },
 *         mutable: true
 *       },
 *       // ... other fields
 *     },
 *     llm: {
 *       priority: 20,  // Lower = earlier in prompt
 *       promptSection: 'Needs'
 *     }
 *   })
 * );
 *
 * // Query registry
 * const schema = ComponentRegistry.get('needs');
 *
 * // Mutate field
 * MutationService.mutate(entity, 'needs', 'hunger', 75, 'system');
 *
 * // Generate LLM prompt
 * const prompt = PromptRenderer.renderEntity(entity, world);
 * ```
 *
 * ## Critical Rules
 *
 * - **Always define schemas for new components** - Enables introspection across all contexts
 * - **Use autoRegister() wrapper** - Auto-registers on import
 * - **Set visibility flags appropriately** - Controls what each context sees
 * - **Mark fields mutable: true if editable** - Enforces mutation validation
 * - **Use SchedulerRenderCache for performance** - 85-99% hit rate typical
 * - **Register caches with MutationService** - Auto-invalidation on mutations
 * - **Provide descriptions for LLM-visible fields** - Improves prompt quality
 * - **Use appropriate widget types** - Enables auto-generated UIs
 * - **Cache schema lookups in loops** - Registry.get() is O(1) but avoid repeated calls
 * - **Use mutation batching for multiple updates** - Single validation pass
 *
 * @see {@link https://github.com/ai-village/multiverse/blob/main/custom_game_engine/packages/introspection/README.md | Introspection Package README}
 */

// ============================================================================
// Type System & Schema Definition
// ============================================================================

// Field metadata system includes: defineComponent, Component, ComponentSchema,
// FieldSchema, FieldType, Visibility, UIHints, CategoryTypes, MutabilityTypes, etc.
export * from './types/index.js';

// ============================================================================
// Core Validation
// ============================================================================

// Schema validation functions: validateSchema, assertValidSchema
// Note: defineComponent is exported from types/ComponentSchema.ts
export * from './core/index.js';

// ============================================================================
// Utility Functions
// ============================================================================

// Type guards, validation helpers, and utility functions
export * from './utils/index.js';

// ============================================================================
// Registry System
// ============================================================================

// ComponentRegistry singleton for schema storage and retrieval
export * from './registry/index.js';

// ============================================================================
// Mutation System
// ============================================================================

// Validated, reversible mutations with undo/redo support
// Includes: MutationService, ValidationService, UndoStack, MutationEvent
export * from './mutation/index.js';

// ============================================================================
// Rendering System
// ============================================================================

// Multi-context renderers for player UI, dev tools, and LLM prompts
// Includes: DevRenderer, PlayerRenderer, WidgetFactory, and widget implementations
export * from './renderers/index.js';

// ============================================================================
// LLM Prompt Generation
// ============================================================================

// LLM prompt rendering from schemas
// Includes: PromptRenderer, AgentPromptRenderer
export * from './prompt/index.js';

// ============================================================================
// Component Schemas
// ============================================================================

// 125+ component schema definitions organized by category:
// - agent/ (18 schemas): personality, skills, needs, mood, profession
// - cognitive/ (20 schemas): memory, beliefs, goals, knowledge, discovery
// - physical/ (12 schemas): body, movement, health, inventory, equipment
// - social/ (15 schemas): relationships, reputation, economy, conflict
// - magic/ (7 schemas): divinity, spells, paradigms, lore
// - world/ (30 schemas): buildings, weather, terrain, realms, portals
// - system/ (12 schemas): steering, pathfinding, vision, debug
// - afterlife/ (5 schemas): death, judgment, bargains, reincarnation
export * from './schemas/index.js';

// ============================================================================
// Performance & Caching
// ============================================================================

// Scheduler-based render caching for 85-99% hit rates
// Includes: RenderCache, CacheMetrics
export * from './cache/index.js';

// ============================================================================
// Cache Infrastructure
// ============================================================================

// IntrospectionCache - Entity query cache with tick-based expiry
export * from './IntrospectionCache.js';

// ============================================================================
// Runtime API
// ============================================================================

// Runtime introspection and entity queries
// Includes: GameIntrospectionAPI, query options, enriched entity types
export * from './api/index.js';
