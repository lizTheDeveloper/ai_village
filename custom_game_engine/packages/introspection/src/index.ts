/**
 * @ai-village/introspection
 *
 * Schema-driven introspection system for component metadata.
 *
 * Provides a unified metadata layer for:
 * - Player UI rendering
 * - LLM prompt generation
 * - Agent self-awareness
 * - User settings UI
 * - Developer debug tools
 */

// Phase 1C: Type exports (Field Metadata System)
// Includes: defineComponent, Component, ComponentSchema, FieldSchema, etc.
export * from './types/index.js';

// Phase 1A: Core exports (validateSchema, assertValidSchema)
// Note: defineComponent is exported from types/ComponentSchema.ts
export * from './core/index.js';

// Phase 1A: Utility exports (type guards, validation helpers)
export * from './utils/index.js';

// Phase 1B: Registry exports (ComponentRegistry) - ✓ IMPLEMENTED
export * from './registry/index.js';

// Phase 2B: Mutation Layer - ✓ IMPLEMENTED
export * from './mutation/index.js';

// Phase 2C: Player Renderers - ✓ IMPLEMENTED
export * from './renderers/index.js';

// Phase 3: Prompt Integration - ✓ IMPLEMENTED
export * from './prompt/index.js';

// Test schemas for Phase 2A
export * from './schemas/index.js';

// Scheduler-based Render Cache - ✓ IMPLEMENTED
export * from './cache/index.js';
