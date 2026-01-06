/**
 * AgentDebugLogger - Deep logging system for debugging agent behavior
 *
 * Tracks and streams to file:
 * - Position history (path walked)
 * - Target positions (where they're going)
 * - Behavior changes (decision making)
 * - Action queue state
 * - Needs and goals
 *
 * Usage:
 *   const logger = new AgentDebugLogger(agentId, 'logs/agent-debug.jsonl');
 *   logger.logTick(world, entity);
 */

import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import * as fs from 'fs';
import * as path from 'path';

export interface AgentDebugEntry {
  timestamp: number;
  tick: number;
  agentId: string;
  agentName?: string;

  // Position & Movement
  position: { x: number; y: number };
  target?: { x: number; y: number; source: 'steering' | 'action_queue' | 'none' };
  velocity?: { x: number; y: number };
  speed?: number;

  // Behavior & Actions
  behavior?: string;
  behaviorQueue?: Array<{
    behavior: string;
    label?: string;
    priority?: string;
    targetPos?: { x: number; y: number };
  }>;
  actionQueue?: Array<{
    type: string;
    priority?: number;
    targetPos?: { x: number; y: number };
    targetId?: string;
  }>;

  // State
  needs?: {
    hunger: number;
    energy: number;
    health: number;
  };
  goals?: {
    personal?: string;
    mediumTerm?: string;
    group?: string;
  };

  // Home & Territory
  home?: { x: number; y: number };
  distanceFromHome?: number;

  // Decisions
  behaviorChanged?: boolean;
  previousBehavior?: string;
  thought?: string;
}

export class AgentDebugLogger {
  private agentId: string;
  private logFilePath: string;
  private writeStream: fs.WriteStream | null = null;
  private lastBehavior: string | null = null;
  private positionHistory: Array<{ x: number; y: number; tick: number }> = [];
  private maxHistorySize = 1000;

  // Batching
  private batchBuffer: AgentDebugEntry[] = [];
  private batchSize = 20; // Write every 20 ticks (~1 second at 20 TPS)
  private lastFlushTick = 0;

  constructor(agentId: string, logFilePath: string = 'logs/agent-debug.jsonl', batchSize: number = 20) {
    this.agentId = agentId;
    this.logFilePath = logFilePath;
    this.batchSize = batchSize;
    this.initLogFile();
  }

  private initLogFile(): void {
    // Ensure log directory exists
    const dir = path.dirname(this.logFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create write stream (append mode)
    this.writeStream = fs.createWriteStream(this.logFilePath, { flags: 'a' });

    // Write header
    const header = {
      type: 'session_start',
      agentId: this.agentId,
      timestamp: Date.now(),
      logFile: this.logFilePath,
    };
    this.writeStream.write(JSON.stringify(header) + '\n');
  }

  /**
   * Log current agent state for this tick
   */
  logTick(world: World, entity: Entity): void {
    if (!this.writeStream) return;

    const tick = this.getCurrentTick(world);

    // Position (required field)
    const position = entity.getComponent('position') as any;
    const entry: AgentDebugEntry = {
      timestamp: Date.now(),
      tick,
      agentId: entity.id,
      position: position ? { x: position.x, y: position.y } : { x: 0, y: 0 },
    };

    // Identity
    const identity = entity.getComponent('identity') as any;
    if (identity) {
      entry.agentName = identity.name;
    }

    // Position history
    if (position) {

      // Track position history
      this.positionHistory.push({ x: position.x, y: position.y, tick });
      if (this.positionHistory.length > this.maxHistorySize) {
        this.positionHistory.shift();
      }
    }

    // Target (check multiple sources)
    const steering = entity.getComponent('steering') as any;
    if (steering?.target) {
      entry.target = {
        x: steering.target.x,
        y: steering.target.y,
        source: 'steering',
      };
    } else {
      // Check action queue for target
      const actionQueue = entity.getComponent('action_queue') as any;
      if (actionQueue) {
        const actions = this.extractActions(actionQueue);
        if (actions.length > 0 && actions[0]?.targetPos) {
          entry.target = {
            x: actions[0].targetPos.x,
            y: actions[0].targetPos.y,
            source: 'action_queue',
          };
        }
      }
    }

    // Movement
    const movement = entity.getComponent('movement') as any;
    if (movement) {
      entry.velocity = { x: movement.velocityX, y: movement.velocityY };
      entry.speed = movement.speed;
    }

    // Behavior
    const agent = entity.getComponent('agent') as any;
    if (agent) {
      entry.behavior = agent.behavior;

      // Detect behavior changes
      if (this.lastBehavior !== null && this.lastBehavior !== agent.behavior) {
        entry.behaviorChanged = true;
        entry.previousBehavior = this.lastBehavior;
      }
      this.lastBehavior = agent.behavior;

      // Behavior queue
      if (agent.behaviorQueue && agent.behaviorQueue.length > 0) {
        entry.behaviorQueue = agent.behaviorQueue.map((b: any) => ({
          behavior: b.behavior,
          label: b.label,
          priority: b.priority,
          targetPos: b.targetPos,
        }));
      }

      // Goals
      entry.goals = {
        personal: agent.personalGoal,
        mediumTerm: agent.mediumTermGoal,
        group: agent.groupGoal,
      };

      // Thought
      if (agent.lastThought) {
        entry.thought = agent.lastThought;
      }

      // Home
      if (agent.assignedBed && position) {
        const bedEntity = world.getEntity(agent.assignedBed);
        if (bedEntity) {
          const bedPos = bedEntity.getComponent('position') as any;
          if (bedPos) {
            entry.home = { x: bedPos.x, y: bedPos.y };
            const dx = position.x - bedPos.x;
            const dy = position.y - bedPos.y;
            entry.distanceFromHome = Math.sqrt(dx * dx + dy * dy);
          }
        }
      }
    }

    // Action queue
    const actionQueue = entity.getComponent('action_queue') as any;
    if (actionQueue) {
      const actions = this.extractActions(actionQueue);
      if (actions.length > 0) {
        entry.actionQueue = actions.map((a: any) => ({
          type: a.type,
          priority: a.priority,
          targetPos: a.targetPos,
          targetId: a.targetId,
        }));
      }
    }

    // Needs
    const needs = entity.getComponent('needs') as any;
    if (needs) {
      entry.needs = {
        hunger: needs.hunger,
        energy: needs.energy,
        health: needs.health,
      };
    }

    // Add to batch buffer
    this.batchBuffer.push(entry);

    // Flush if batch is full
    if (this.batchBuffer.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Flush buffered entries to file
   */
  flush(): void {
    if (!this.writeStream || this.batchBuffer.length === 0) return;

    // Write all buffered entries
    for (const entry of this.batchBuffer) {
      this.writeStream.write(JSON.stringify(entry) + '\n');
    }

    this.batchBuffer = [];
  }

  /**
   * Extract actions from action queue (handles different queue implementations)
   */
  private extractActions(actionQueue: any): any[] {
    if (!actionQueue) return [];

    // Try different ways to access queue data
    if (typeof actionQueue.peek === 'function') {
      const current = actionQueue.peek();
      return current ? [current] : [];
    }

    if (Array.isArray(actionQueue.queue)) {
      return actionQueue.queue;
    }

    if (typeof actionQueue.isEmpty === 'function' && !actionQueue.isEmpty()) {
      return (actionQueue as any)._queue || (actionQueue as any).actions || [];
    }

    return [];
  }

  /**
   * Get current tick from world
   */
  private getCurrentTick(world: World): number {
    const timeEntities = world.query().with('time').executeEntities();
    const firstTimeEntity = timeEntities[0];
    if (firstTimeEntity) {
      const time = firstTimeEntity.getComponent('time') as any;
      return time?.tick || 0;
    }
    return 0;
  }

  /**
   * Get position history for this agent
   */
  getPositionHistory(): Array<{ x: number; y: number; tick: number }> {
    return [...this.positionHistory];
  }

  /**
   * Close the log file
   */
  close(): void {
    if (this.writeStream) {
      // Flush any remaining buffered entries
      this.flush();

      const footer = {
        type: 'session_end',
        agentId: this.agentId,
        timestamp: Date.now(),
        totalPositions: this.positionHistory.length,
      };
      this.writeStream.write(JSON.stringify(footer) + '\n');
      this.writeStream.end();
      this.writeStream = null;
    }
  }
}

/**
 * AgentDebugManager - Manages multiple agent loggers
 */
export class AgentDebugManager {
  private loggers = new Map<string, AgentDebugLogger>();
  private logDir: string;

  constructor(logDir: string = 'logs/agent-debug') {
    this.logDir = logDir;
  }

  /**
   * Start deep logging for an agent
   */
  startLogging(agentId: string, agentName?: string): void {
    if (this.loggers.has(agentId)) {
      console.log(`[AgentDebug] Already logging agent ${agentId}`);
      return;
    }

    const filename = agentName
      ? `${agentName.replace(/\s+/g, '-')}-${agentId.substring(0, 8)}.jsonl`
      : `agent-${agentId.substring(0, 8)}.jsonl`;

    const logPath = path.join(this.logDir, filename);
    const logger = new AgentDebugLogger(agentId, logPath);
    this.loggers.set(agentId, logger);

    console.log(`[AgentDebug] Started logging agent ${agentId} to ${logPath}`);
  }

  /**
   * Stop deep logging for an agent
   */
  stopLogging(agentId: string): void {
    const logger = this.loggers.get(agentId);
    if (logger) {
      logger.close();
      this.loggers.delete(agentId);
      console.log(`[AgentDebug] Stopped logging agent ${agentId}`);
    }
  }

  /**
   * Log tick for all tracked agents
   */
  logTick(world: World): void {
    for (const [agentId, logger] of this.loggers) {
      const entity = world.getEntity(agentId);
      if (entity) {
        logger.logTick(world, entity);
      } else {
        // Agent no longer exists, stop logging
        this.stopLogging(agentId);
      }
    }
  }

  /**
   * Get list of agents currently being logged
   */
  getTrackedAgents(): string[] {
    return Array.from(this.loggers.keys());
  }

  /**
   * Stop all logging
   */
  closeAll(): void {
    for (const [agentId, logger] of this.loggers) {
      logger.close();
    }
    this.loggers.clear();
  }

  /**
   * Get position history for a currently logged agent
   */
  getPositionHistory(agentId: string): Array<{ x: number; y: number; tick: number }> {
    const logger = this.loggers.get(agentId);
    return logger ? logger.getPositionHistory() : [];
  }

  /**
   * Read log entries from a log file
   */
  readLogFile(logFilePath: string, limit?: number): AgentDebugEntry[] {
    if (!fs.existsSync(logFilePath)) {
      return [];
    }

    const entries: AgentDebugEntry[] = [];
    const content = fs.readFileSync(logFilePath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    // Read from end if limit specified (get most recent)
    const startIdx = limit ? Math.max(0, lines.length - limit) : 0;
    const linesToRead = lines.slice(startIdx);

    for (const line of linesToRead) {
      try {
        const entry = JSON.parse(line);
        // Skip session markers
        if (entry.type !== 'session_start' && entry.type !== 'session_end') {
          entries.push(entry);
        }
      } catch (e) {
        // Skip malformed lines
      }
    }

    return entries;
  }

  /**
   * Find log file for an agent (by ID or name)
   */
  findLogFile(agentIdOrName: string): string | null {
    if (!fs.existsSync(this.logDir)) {
      return null;
    }

    const files = fs.readdirSync(this.logDir);

    // Try exact match with agent ID
    const byId = files.find((f) => f.includes(agentIdOrName.substring(0, 8)));
    if (byId) {
      return path.join(this.logDir, byId);
    }

    // Try match by agent name
    const normalizedName = agentIdOrName.toLowerCase().replace(/\s+/g, '-');
    const byName = files.find((f) => f.toLowerCase().startsWith(normalizedName));
    if (byName) {
      return path.join(this.logDir, byName);
    }

    return null;
  }

  /**
   * Get recent log entries for an agent
   */
  getRecentEntries(agentIdOrName: string, limit: number = 100): AgentDebugEntry[] {
    const logFile = this.findLogFile(agentIdOrName);
    if (!logFile) {
      return [];
    }
    return this.readLogFile(logFile, limit);
  }

  /**
   * Analyze agent behavior from logs
   */
  analyzeAgent(agentIdOrName: string): {
    totalEntries: number;
    maxDistanceFromHome: number;
    behaviorChanges: Array<{ tick: number; from: string; to: string; distance: number }>;
    avgDistanceFromHome: number;
    behaviors: Map<string, number>;
    recentThoughts: string[];
    currentPosition?: { x: number; y: number };
    currentTarget?: { x: number; y: number; source: string };
  } {
    const entries = this.getRecentEntries(agentIdOrName, 1000);

    const analysis = {
      totalEntries: entries.length,
      maxDistanceFromHome: 0,
      behaviorChanges: [] as Array<{ tick: number; from: string; to: string; distance: number }>,
      avgDistanceFromHome: 0,
      behaviors: new Map<string, number>(),
      recentThoughts: [] as string[],
      currentPosition: undefined as { x: number; y: number } | undefined,
      currentTarget: undefined as { x: number; y: number; source: string } | undefined,
    };

    if (entries.length === 0) {
      return analysis;
    }

    let totalDistance = 0;
    let distanceCount = 0;

    for (const entry of entries) {
      // Track max distance from home
      if (entry.distanceFromHome !== undefined) {
        analysis.maxDistanceFromHome = Math.max(analysis.maxDistanceFromHome, entry.distanceFromHome);
        totalDistance += entry.distanceFromHome;
        distanceCount++;
      }

      // Track behavior changes
      if (entry.behaviorChanged && entry.previousBehavior && entry.behavior) {
        analysis.behaviorChanges.push({
          tick: entry.tick,
          from: entry.previousBehavior,
          to: entry.behavior,
          distance: entry.distanceFromHome || 0,
        });
      }

      // Count behaviors
      if (entry.behavior) {
        const count = analysis.behaviors.get(entry.behavior) || 0;
        analysis.behaviors.set(entry.behavior, count + 1);
      }

      // Collect recent thoughts
      if (entry.thought && !analysis.recentThoughts.includes(entry.thought)) {
        analysis.recentThoughts.push(entry.thought);
        if (analysis.recentThoughts.length > 10) {
          analysis.recentThoughts.shift();
        }
      }
    }

    // Calculate average distance
    if (distanceCount > 0) {
      analysis.avgDistanceFromHome = totalDistance / distanceCount;
    }

    // Get current state from last entry
    const lastEntry = entries[entries.length - 1];
    if (lastEntry) {
      analysis.currentPosition = lastEntry.position;
      analysis.currentTarget = lastEntry.target;
    }

    return analysis;
  }

  /**
   * List all available log files
   */
  listLogFiles(): Array<{ filename: string; path: string; size: number }> {
    if (!fs.existsSync(this.logDir)) {
      return [];
    }

    const files = fs.readdirSync(this.logDir);
    return files
      .filter((f) => f.endsWith('.jsonl'))
      .map((f) => {
        const fullPath = path.join(this.logDir, f);
        const stats = fs.statSync(fullPath);
        return {
          filename: f,
          path: fullPath,
          size: stats.size,
        };
      });
  }
}
