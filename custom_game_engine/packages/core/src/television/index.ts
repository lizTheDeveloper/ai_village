/**
 * Television Module
 *
 * Complete TV broadcasting system with content-centric architecture.
 *
 * Key Concepts:
 * - Content (episodes, recordings) are persistent ECS entities
 * - Broadcasting is separate from content creation
 * - Tiered storage (hot/warm/cold) for content archiving
 * - Integration with ChatRoomSystem for station communication
 *
 * Modules:
 * - TVContent: Persistent content entities (episodes, scripts)
 * - TVStation: Station organization and staff
 * - TVShow: Show configuration and cast
 * - TVBroadcasting: Schedule and transmission
 * - Systems: Broadcasting, Ratings, Development, Writing, Production, Post-Production
 * - Generation: LLM-powered script and dialogue generation
 * - Production: Casting, scheduling, resource management
 * - Formats: Specialized show types (News, Talk, Game, Soap Opera)
 */

// Content types and entities
export * from './TVContent.js';

// Station organization
export * from './TVStation.js';

// Show configuration
export * from './TVShow.js';

// Broadcasting and scheduling
export * from './TVBroadcasting.js';

// Systems
export * from './systems/index.js';

// Generation (LLM-powered content creation)
export * from './generation/index.js';

// Production (casting, scheduling)
export * from './production/index.js';

// Formats (specialized show types)
export * from './formats/index.js';
