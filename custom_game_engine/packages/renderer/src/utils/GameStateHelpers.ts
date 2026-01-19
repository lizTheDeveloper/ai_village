/**
 * GameStateHelpers - Utility functions for accessing game state
 *
 * Provides centralized access to player ID and universe ID that are stored
 * in different locations (localStorage, window.game, etc.)
 */

/**
 * Get the current player ID.
 *
 * The player ID is stored in localStorage at key 'ai-village-player-id'
 * and is created automatically on first run. This ID persists across sessions
 * and is used for multiverse server sync.
 *
 * @returns Player ID string (e.g., "player:550e8400-e29b-41d4-a716-446655440000")
 *          or 'local-player' if not found (fallback for legacy/test scenarios)
 */
export function getPlayerId(): string {
  const playerId = localStorage.getItem('ai-village-player-id');
  if (!playerId) {
    console.warn('[GameStateHelpers] Player ID not found in localStorage. Using fallback "local-player".');
    return 'local-player';
  }
  return playerId;
}

/**
 * Get the current universe ID.
 *
 * The universe ID is stored in gameLoop.universeId and represents the currently
 * active universe/timeline. This is set during game initialization and can change
 * when loading different saves or switching universes.
 *
 * @returns Universe ID string (e.g., "universe:main")
 *          or 'local-universe' if not found (fallback for legacy/test scenarios)
 */
export function getUniverseId(): string {
  // Access via window.game (set up by setupDebugAPI in main.ts)
  const game = (window as any).game;
  if (!game || !game.gameLoop) {
    console.warn('[GameStateHelpers] window.game.gameLoop not available. Using fallback "local-universe".');
    return 'local-universe';
  }

  const universeId = game.gameLoop.universeId;
  if (!universeId) {
    console.warn('[GameStateHelpers] gameLoop.universeId not set. Using fallback "local-universe".');
    return 'local-universe';
  }

  return universeId;
}
