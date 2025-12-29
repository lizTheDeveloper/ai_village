/**
 * Behaviors Module
 *
 * Extracted behavior handlers for the AISystem.
 * Each behavior is a pure function that takes (entity, world) and updates
 * the entity's state and movement accordingly.
 *
 * These behaviors integrate with the navigation module:
 * - MapKnowledge for worn paths and resource areas
 * - HearsayMemory for social knowledge ("berries up north")
 * - SpeechParser for parsing and generating announcements
 */

export { navigateBehavior } from './NavigateBehavior.js';
export { exploreFrontierBehavior } from './ExploreFrontierBehavior.js';
export { exploreSpiralBehavior } from './ExploreSpiralBehavior.js';
export { followGradientBehavior } from './FollowGradientBehavior.js';
