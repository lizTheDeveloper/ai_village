/**
 * Core stable components.
 */

export * from './PositionComponent.js';
export * from './PhysicsComponent.js';
export * from './RenderableComponent.js';
export * from './TagsComponent.js';
export * from './AgentComponent.js';
export * from './MovementComponent.js';
export * from './NeedsComponent.js';
export * from './ResourceComponent.js';
export * from './MemoryComponent.js';
export * from './VisionComponent.js';
export * from './ConversationComponent.js';
export * from './RelationshipComponent.js';
export * from './PersonalityComponent.js';
export * from './IdentityComponent.js';
export * from './BuildingComponent.js';
export * from './InventoryComponent.js';
export * from './TemperatureComponent.js';
export * from './WeatherComponent.js';

// Re-export types explicitly (export * doesn't re-export types)
export type { AgentBehavior } from './AgentComponent.js';
