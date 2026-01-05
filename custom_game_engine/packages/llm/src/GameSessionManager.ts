/**
 * Game Session Manager
 *
 * Tracks active game sessions for multi-game cooldown coordination.
 * Each browser/tab maintains a session with heartbeat.
 *
 * @example
 * const sessionManager = new GameSessionManager();
 * sessionManager.registerSession('session-123');
 * sessionManager.heartbeat('session-123');
 * const activeGames = sessionManager.getActiveSessionCount();
 */

export interface GameSession {
  sessionId: string;
  connectedAt: number;
  lastHeartbeat: number;
  lastRequestTime: number;
  requestCount: number;
}

export class GameSessionManager {
  private sessions: Map<string, GameSession> = new Map();
  private readonly SESSION_TIMEOUT_MS: number = 60000; // 1 minute without heartbeat

  constructor(sessionTimeoutMs: number = 60000) {
    this.SESSION_TIMEOUT_MS = sessionTimeoutMs;
  }

  /**
   * Register a new game session
   *
   * @param sessionId - Unique session identifier
   */
  registerSession(sessionId: string): void {
    const now = Date.now();

    this.sessions.set(sessionId, {
      sessionId,
      connectedAt: now,
      lastHeartbeat: now,
      lastRequestTime: 0,
      requestCount: 0,
    });

    console.log(
      `[GameSessionManager] Registered session: ${sessionId} (total: ${this.sessions.size})`
    );
  }

  /**
   * Update heartbeat for a session
   *
   * @param sessionId - Session identifier
   */
  heartbeat(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastHeartbeat = Date.now();
    } else {
      // Auto-register on heartbeat
      this.registerSession(sessionId);
    }
  }

  /**
   * Record an LLM request for a session
   *
   * @param sessionId - Session identifier
   */
  recordRequest(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastRequestTime = Date.now();
      session.requestCount++;
    } else {
      console.warn(
        `[GameSessionManager] Received request for unknown session: ${sessionId}`
      );
    }
  }

  /**
   * Get session information
   *
   * @param sessionId - Session identifier
   * @returns Session object or undefined if not found
   */
  getSession(sessionId: string): GameSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Check if session exists
   *
   * @param sessionId - Session identifier
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Get number of active sessions (after cleanup)
   *
   * @returns Number of active game sessions
   */
  getActiveSessionCount(): number {
    this.cleanupStale();
    return this.sessions.size;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): GameSession[] {
    this.cleanupStale();
    return Array.from(this.sessions.values());
  }

  /**
   * Remove stale sessions (no heartbeat for > timeout)
   */
  private cleanupStale(): void {
    const now = Date.now();
    const staleSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastHeartbeat > this.SESSION_TIMEOUT_MS) {
        staleSessions.push(sessionId);
      }
    }

    for (const sessionId of staleSessions) {
      this.sessions.delete(sessionId);
      console.log(
        `[GameSessionManager] Removed stale session: ${sessionId} (total: ${this.sessions.size})`
      );
    }
  }

  /**
   * Manually remove a session
   *
   * @param sessionId - Session to remove
   */
  removeSession(sessionId: string): void {
    if (this.sessions.delete(sessionId)) {
      console.log(
        `[GameSessionManager] Removed session: ${sessionId} (total: ${this.sessions.size})`
      );
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalSessions: number;
    averageRequestsPerSession: number;
    oldestSessionAge: number;
  } {
    this.cleanupStale();

    if (this.sessions.size === 0) {
      return {
        totalSessions: 0,
        averageRequestsPerSession: 0,
        oldestSessionAge: 0,
      };
    }

    const now = Date.now();
    let totalRequests = 0;
    let oldestAge = 0;

    for (const session of this.sessions.values()) {
      totalRequests += session.requestCount;
      const age = now - session.connectedAt;
      oldestAge = Math.max(oldestAge, age);
    }

    return {
      totalSessions: this.sessions.size,
      averageRequestsPerSession: totalRequests / this.sessions.size,
      oldestSessionAge: oldestAge,
    };
  }

  /**
   * Clear all sessions (for testing)
   */
  clear(): void {
    this.sessions.clear();
  }
}
