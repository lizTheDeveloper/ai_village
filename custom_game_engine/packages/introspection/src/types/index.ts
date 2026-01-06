/**
 * Introspection System - Type Definitions
 *
 * Metadata type system for component introspection.
 * Defines how components expose themselves to different consumers (Player, LLM, Agent, User, Dev).
 */

// Widget types
export type { WidgetType } from './WidgetTypes.js';

// Category types
export type { ComponentCategory } from './CategoryTypes.js';

// Visibility types
export type { Visibility } from './VisibilityTypes.js';
export { isVisibleToLLM, shouldSummarizeForLLM } from './VisibilityTypes.js';

// Mutability types
export type { Mutability } from './MutabilityTypes.js';
export { isMutable, requiresMutator, canMutate } from './MutabilityTypes.js';

// UI hints
export type { UIHints, UIConfig } from './UIHints.js';

// LLM configuration
export type { LLMConfig, FieldLLMConfig } from './LLMConfig.js';

// Field schema
export type { FieldSchema } from './FieldSchema.js';

// Field types
export type { FieldType } from './FieldTypes.js';

// Component schema (core)
export type { Component, ComponentSchema, DevConfig, MutatorFunction, CanvasRenderable } from './ComponentSchema.js';
export { defineComponent } from './ComponentSchema.js';
