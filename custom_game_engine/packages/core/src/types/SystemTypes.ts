/**
 * Centralized system and engine type definitions
 */

export type GameLoopState = 'stopped' | 'running' | 'paused';

export type RenderLayer = 'terrain' | 'floor' | 'building' | 'object' | 'entity' | 'effect' | 'ui';

export type EventPriority = 'immediate' | 'high' | 'normal' | 'low' | 'deferred';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export type MaterialTexture = 'solid' | 'grainy' | 'shiny' | 'rough' | 'translucent' | 'glowing';

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';
