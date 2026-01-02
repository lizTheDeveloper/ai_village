/**
 * Metrics Streaming Server
 *
 * WebSocket server that receives metrics from the browser client
 * and persists them using MetricsStorage.
 *
 * Usage: npx tsx scripts/metrics-server.ts
 *
 * HTTP Endpoints:
 *   GET /                    - Session browser (start here)
 *   GET /dashboard           - LLM-optimized text dashboard (primary interface)
 *   GET /dashboard/timeline  - Chronological event timeline
 *   GET /dashboard/agents    - Agent list/menu for session (links to details)
 *   GET /dashboard/agent     - Detailed agent info with LLM context (more-agent-info)
 *   GET /dashboard/resources - Resource flow analysis
 *   GET /metrics             - Raw JSON metrics
 *   GET /metrics/building    - Building-related metrics
 *   GET /metrics/summary     - Summary statistics
 *
 * Save/Load/Fork API (Time Manipulation Dev Tools):
 *   GET    /api/saves?session=<id>     - List saves for a session
 *   POST   /api/load                   - Load a save (rewind)
 *   POST   /api/fork                   - Fork a new universe from a save
 *   DELETE /api/save?session=<id>&save=<name> - Delete a save
 *   GET    /api/save-load              - API help and documentation
 *
 * Unified Dashboard Views (shared with Player UI):
 *   GET /views               - List all available views
 *   GET /view/:id            - Get view data as formatted text
 *   GET /view/:id?format=json - Get view data as JSON
 *   GET /view/:id?session=<id> - Get view for specific session
 *
 * Live Entity API (queries running game in real-time):
 *   GET  /api/live/status      - Check if game is connected
 *   GET  /api/live/entities    - List all agents (live)
 *   GET  /api/live/entity      - Get entity state by ID (live)
 *   GET  /api/live/prompt      - Get LLM prompt for agent (live)
 *   POST /api/live/set-llm     - Set custom LLM config for agent (live)
 *   GET  /api/live/universe    - Get universe configuration (dimensions, laws, etc.)
 *   GET  /api/live/magic       - Get magic system info (enabled paradigms, etc.)
 *   GET  /api/live/pending-approvals - Get pending creations awaiting divine approval
 *   POST /api/live/approve-creation?id=<id> - Approve a pending creation
 *   POST /api/live/reject-creation?id=<id>  - Reject a pending creation
 *   GET  /api/live/divinity    - Get divinity info (gods, belief, pantheons, etc.)
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { spawn, type ChildProcess } from 'child_process';
import { MetricsStorage, type StoredMetric } from '../packages/core/src/metrics/MetricsStorage.js';
import { viewRegistry, registerBuiltInViews, hasTextFormatter, type ViewContext } from '../packages/core/src/dashboard/index.js';
import type { CanonEvent } from '../packages/core/src/metrics/CanonEventRecorder.js';
import { SaveStateManager } from '../packages/core/src/persistence/SaveStateManager.js';
import * as path from 'path';
import * as fs from 'fs';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// ============================================================================
// HEADLESS GAME PROCESS MANAGEMENT
// ============================================================================

interface HeadlessGameProcess {
  sessionId: string;
  process: ChildProcess;
  startedAt: number;
  status: 'starting' | 'running' | 'stopped' | 'error';
  agentCount: number;
}

const headlessGames = new Map<string, HeadlessGameProcess>();

function spawnHeadlessGame(sessionId: string, agentCount: number = 5): HeadlessGameProcess {
  // Use vite-node to run demo/headless.ts with proper workspace module resolution
  const scriptPath = path.join(process.cwd(), 'demo', 'headless.ts');

  const child = spawn('npx', [
    'vite-node',
    '--root', 'demo',
    scriptPath,
    '--',
    `--session-id=${sessionId}`,
    `--agents=${agentCount}`,
  ], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  const gameProcess: HeadlessGameProcess = {
    sessionId,
    process: child,
    startedAt: Date.now(),
    status: 'starting',
    agentCount,
  };

  child.stdout?.on('data', (data: Buffer) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`[Headless:${sessionId}] ${output}`);
    }
    if (output.includes('Game running') || output.includes('Started at')) {
      gameProcess.status = 'running';
    }
  });

  child.stderr?.on('data', (data: Buffer) => {
    console.error(`[Headless:${sessionId}] ERROR: ${data.toString().trim()}`);
  });

  child.on('error', (err) => {
    console.error(`[Headless:${sessionId}] Process error:`, err);
    gameProcess.status = 'error';
  });

  child.on('exit', (code) => {
    console.log(`[Headless:${sessionId}] Exited with code ${code}`);
    gameProcess.status = 'stopped';
    headlessGames.delete(sessionId);
  });

  headlessGames.set(sessionId, gameProcess);
  return gameProcess;
}

function stopHeadlessGame(sessionId: string): boolean {
  const game = headlessGames.get(sessionId);
  if (!game) return false;

  game.process.kill('SIGTERM');
  game.status = 'stopped';
  headlessGames.delete(sessionId);
  return true;
}

function listHeadlessGames(): Array<{
  sessionId: string;
  status: string;
  startedAt: number;
  uptime: number;
  agentCount: number;
}> {
  const result: Array<{
    sessionId: string;
    status: string;
    startedAt: number;
    uptime: number;
    agentCount: number;
  }> = [];

  for (const [sessionId, game] of headlessGames) {
    result.push({
      sessionId,
      status: game.status,
      startedAt: game.startedAt,
      uptime: Date.now() - game.startedAt,
      agentCount: game.agentCount,
    });
  }

  return result;
}

const PORT = 8765;
const DATA_DIR = path.join(process.cwd(), 'metrics-data');
const SAVES_DIR = path.join(process.cwd(), 'saves');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure saves directory exists
if (!fs.existsSync(SAVES_DIR)) {
  fs.mkdirSync(SAVES_DIR, { recursive: true });
}

// Initialize storage
const storage = new MetricsStorage(DATA_DIR);

// Initialize save state manager
const saveStateManager = new SaveStateManager(SAVES_DIR);

// Register dashboard views
registerBuiltInViews();

// Track active WebSocket sessions
const wsSessions = new Map<WebSocket, string>();
let messageCount = 0;
let lastLogTime = Date.now();

const HTTP_PORT = 8766;

// ============================================================
// Game Session Tracking
// ============================================================

interface GameSession {
  id: string;
  startTime: number;
  endTime: number | null;
  eventCount: number;
  agentCount: number;
  deaths: number;
  summary: string;
  /** True if this is a test run (from test framework like Vitest) */
  isTest: boolean;
}

// Track all game sessions and their metrics
const gameSessions = new Map<string, GameSession>();
const sessionMetrics = new Map<string, StoredMetric[]>();

// ============================================================
// Canon Event System - Multiverse Bridges
// ============================================================

// Track canon events per session
const sessionCanonEvents = new Map<string, CanonEvent[]>();

// Canon events directory
const CANON_DIR = path.join(DATA_DIR, 'canon-events');
if (!fs.existsSync(CANON_DIR)) {
  fs.mkdirSync(CANON_DIR, { recursive: true });
}

// ============================================================
// Live Query System
// ============================================================

interface PendingQuery {
  resolve: (response: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

// Track pending queries waiting for responses from game clients
const pendingQueries = new Map<string, PendingQuery>();
const QUERY_TIMEOUT_MS = 5000;

/**
 * Send a query to a connected game client and wait for response
 */
async function sendQueryToGame(ws: WebSocket, queryType: string, entityId?: string): Promise<unknown> {
  const requestId = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingQueries.delete(requestId);
      reject(new Error('Query timed out'));
    }, QUERY_TIMEOUT_MS);

    pendingQueries.set(requestId, { resolve, reject, timeout });

    ws.send(JSON.stringify({
      type: 'query',
      requestId,
      queryType,
      entityId,
    }));
  });
}

/**
 * Get the first active game client WebSocket
 */
function getActiveGameClient(): WebSocket | null {
  for (const [ws, _sessionId] of wsSessions.entries()) {
    if (ws.readyState === WebSocket.OPEN) {
      return ws;
    }
  }
  return null;
}

function getOrCreateSession(sessionId: string, isTest = false): GameSession {
  if (!gameSessions.has(sessionId)) {
    gameSessions.set(sessionId, {
      id: sessionId,
      startTime: Date.now(),
      endTime: null,
      eventCount: 0,
      agentCount: 0,
      deaths: 0,
      summary: 'New session',
      isTest,
    });
    sessionMetrics.set(sessionId, []);
  }
  return gameSessions.get(sessionId)!;
}

function markSessionAsTest(sessionId: string): void {
  const session = gameSessions.get(sessionId);
  if (session) {
    session.isTest = true;
    // Rename session ID to have test_ prefix if it doesn't already
    if (!session.id.startsWith('test_')) {
      const newId = session.id.replace('game_', 'test_');
      gameSessions.delete(sessionId);
      session.id = newId;
      gameSessions.set(newId, session);

      // Move metrics to new session ID
      const metrics = sessionMetrics.get(sessionId) || [];
      sessionMetrics.delete(sessionId);
      sessionMetrics.set(newId, metrics);

      console.log(`[${new Date().toISOString()}] Session ${sessionId} marked as test -> ${newId}`);
    }
  }
}

function addMetricToSession(sessionId: string, metric: StoredMetric): void {
  const session = getOrCreateSession(sessionId);
  const metrics = sessionMetrics.get(sessionId)!;

  // Add sessionId to metric
  const metricWithSession = { ...metric, sessionId };
  metrics.push(metricWithSession);
  storage.addToHotStorage(metricWithSession);

  // Update session stats
  session.eventCount++;
  session.endTime = Date.now();

  if (metric.agentId) {
    // Track unique villagers only (agents with useLLM field, not animals)
    const villagerMetrics = metrics.filter(m => {
      if (!m.agentId) return false;
      const data = m.data as Record<string, unknown> | undefined;
      return data?.useLLM !== undefined;
    });
    const uniqueVillagers = new Set(villagerMetrics.map(m => m.agentId));
    session.agentCount = uniqueVillagers.size;
  }

  if (metric.type === 'agent:death') {
    session.deaths++;
  }

  // Update summary
  const duration = Math.floor((session.endTime - session.startTime) / 1000);
  session.summary = `${session.eventCount} events, ${session.agentCount} agents, ${session.deaths} deaths, ${duration}s`;
}

function getAllSessions(): GameSession[] {
  return Array.from(gameSessions.values()).sort((a, b) => b.startTime - a.startTime);
}

function getSessionMetrics(sessionId: string): StoredMetric[] {
  return sessionMetrics.get(sessionId) || [];
}

interface SessionSummary {
  agents: string[];
  agentNames: Record<string, string>; // Map agent ID to name
  buildings: { type: string; completed: boolean }[];
  buildingsByType: Record<string, { started: number; completed: number }>; // Building analysis
  relationships: number;
  resourcesGathered: Record<string, number>;
  resourcesConsumed: Record<string, number>; // Track consumption separately
  resourceDestinations: Record<string, { crafted: number; built: number; eaten: number; deposited: number }>; // Where resources went
  topActivities: [string, number][];
  deathCauses: Record<string, number>;
  status: string;
  // Food and sleep tracking
  foodConsumed: { agentId: string; foodType: string; amount: number }[];
  sleepEvents: { starts: number; wakes: number; collapses: number };
  // Weather and time
  weatherChanges: { from: string; to: string; timestamp: number }[];
  timeEvents: { dayChanges: number; seasonChanges: string[]; currentDay: number };
  // Exploration
  exploration: { tilesVisited: number; wanderSessions: number; milestones: number };
  // Memories and cognition
  memories: { agentId: string; content: string; importance: number; type: string }[];
  beliefs: { agentId: string; content: string; confidence: number }[];
  goalsAchieved: { agentId: string; behavior: string; summary?: string }[];
  reflections: number;
  journalEntries: number;
}

function getSessionSummary(sessionId: string): SessionSummary {
  const metrics = getSessionMetrics(sessionId);

  const agents = new Set<string>();
  const agentNames: Record<string, string> = {};
  const buildings: { type: string; completed: boolean }[] = [];
  const buildingsByType: Record<string, { started: number; completed: number }> = {};
  let relationships = 0;
  const resourcesGathered: Record<string, number> = {};
  const resourcesConsumed: Record<string, number> = {};
  const resourceDestinations: Record<string, { crafted: number; built: number; eaten: number; deposited: number }> = {};
  const activities: Record<string, number> = {};
  const deathCauses: Record<string, number> = {};

  // Food and sleep tracking
  const foodConsumed: { agentId: string; foodType: string; amount: number }[] = [];
  const sleepEvents = { starts: 0, wakes: 0, collapses: 0 };

  // Weather and time
  const weatherChanges: { from: string; to: string; timestamp: number }[] = [];
  const timeEvents = { dayChanges: 0, seasonChanges: [] as string[], currentDay: 1 };

  // Exploration
  const exploration = { tilesVisited: 0, wanderSessions: 0, milestones: 0 };

  // Cognition tracking
  const memories: { agentId: string; content: string; importance: number; type: string }[] = [];
  const beliefs: { agentId: string; content: string; confidence: number }[] = [];
  const goalsAchieved: { agentId: string; behavior: string; summary?: string }[] = [];
  let reflections = 0;
  let journalEntries = 0;

  for (const m of metrics) {
    // Track villagers only (agents with useLLM field, not animals)
    if (m.agentId && !m.agentId.startsWith('system')) {
      const data = m.data as Record<string, unknown> | undefined;
      if (data?.useLLM !== undefined) {
        agents.add(m.agentId);
      }
    }

    // Track buildings with type analysis
    if (m.type === 'task:started' && m.data?.taskType === 'construction') {
      const buildingType = String(m.data.buildingType || 'unknown');
      buildings.push({ type: buildingType, completed: false });
      if (!buildingsByType[buildingType]) {
        buildingsByType[buildingType] = { started: 0, completed: 0 };
      }
      buildingsByType[buildingType].started++;
    }
    if (m.type === 'building:complete') {
      const buildingType = String(m.data?.buildingType || 'unknown');
      const existing = buildings.find(b => b.type === buildingType && !b.completed);
      if (existing) {
        existing.completed = true;
      } else {
        buildings.push({ type: buildingType, completed: true });
      }
      if (!buildingsByType[buildingType]) {
        buildingsByType[buildingType] = { started: 0, completed: 0 };
      }
      buildingsByType[buildingType].completed++;
    }

    // Track relationships
    if (m.type === 'relationship:formed') {
      relationships++;
    }

    // Track resources gathered
    if (m.type === 'resource:gathered') {
      const resource = String(m.data?.resourceType || 'unknown');
      const amount = Number(m.data?.amount) || 1;
      resourcesGathered[resource] = (resourcesGathered[resource] || 0) + amount;
    }

    // Track resources consumed with destination
    if (m.type === 'resource:consumed') {
      const resource = String(m.data?.resourceType || 'unknown');
      const amount = Number(m.data?.amount) || 1;
      const purpose = String(m.data?.purpose || 'unknown');
      resourcesConsumed[resource] = (resourcesConsumed[resource] || 0) + amount;

      // Track destination
      if (!resourceDestinations[resource]) {
        resourceDestinations[resource] = { crafted: 0, built: 0, eaten: 0, deposited: 0 };
      }
      if (purpose === 'food') {
        resourceDestinations[resource].eaten += amount;
      } else if (purpose === 'crafting') {
        resourceDestinations[resource].crafted += amount;
      } else if (purpose === 'building') {
        resourceDestinations[resource].built += amount;
      }
    }

    // Track items deposited to storage
    if (m.type === 'items:deposited') {
      const items = m.data?.items as Array<{ itemId: string; amount: number }> | undefined;
      if (items) {
        for (const item of items) {
          if (!resourceDestinations[item.itemId]) {
            resourceDestinations[item.itemId] = { crafted: 0, built: 0, eaten: 0, deposited: 0 };
          }
          resourceDestinations[item.itemId].deposited += item.amount;
        }
      }
    }

    // Track food consumption
    if (m.type === 'resource:consumed' && m.data?.purpose === 'food' && m.agentId) {
      foodConsumed.push({
        agentId: m.agentId,
        foodType: String(m.data.resourceType || 'unknown'),
        amount: Number(m.data.amount) || 1,
      });
    }

    // Track sleep events
    if (m.type === 'agent:sleep_start') {
      sleepEvents.starts++;
    }
    if (m.type === 'agent:woke') {
      sleepEvents.wakes++;
    }
    if (m.type === 'agent:collapsed') {
      sleepEvents.collapses++;
    }

    // Track weather changes
    if (m.type === 'weather:changed') {
      weatherChanges.push({
        from: String(m.data?.oldWeather || 'unknown'),
        to: String(m.data?.weatherType || 'unknown'),
        timestamp: m.timestamp,
      });
    }

    // Track time events
    if (m.type === 'time:day_changed') {
      timeEvents.dayChanges++;
      timeEvents.currentDay = Number(m.data?.day) || timeEvents.currentDay;
    }
    if (m.type === 'time:season_change') {
      const season = String(m.data?.season || m.data?.newSeason || 'unknown');
      if (!timeEvents.seasonChanges.includes(season)) {
        timeEvents.seasonChanges.push(season);
      }
    }

    // Track exploration
    if (m.type === 'tile:visited') {
      exploration.tilesVisited++;
    }
    if (m.type === 'exploration:wander_session') {
      exploration.wanderSessions++;
    }
    if (m.type === 'exploration:milestone') {
      exploration.milestones++;
    }

    // Track activities
    if (m.type === 'activity:started') {
      const activity = String(m.data?.activity || 'unknown');
      activities[activity] = (activities[activity] || 0) + 1;
    }

    // Track death causes
    if (m.type === 'agent:death') {
      const cause = String(m.data?.causeOfDeath || 'unknown');
      deathCauses[cause] = (deathCauses[cause] || 0) + 1;
    }

    // Track memories (keep top by importance)
    if (m.type === 'memory:formed' && m.agentId) {
      memories.push({
        agentId: m.agentId,
        content: String(m.data?.content || ''),
        importance: Number(m.data?.importance) || 0,
        type: String(m.data?.memoryType || 'unknown'),
      });
    }

    // Track beliefs
    if (m.type === 'belief:formed' && m.agentId) {
      beliefs.push({
        agentId: m.agentId,
        content: String(m.data?.content || ''),
        confidence: Number(m.data?.confidence) || 0,
      });
    }

    // Track goals achieved
    if (m.type === 'goal:achieved' && m.agentId) {
      goalsAchieved.push({
        agentId: m.agentId,
        behavior: String(m.data?.behavior || 'unknown'),
        summary: m.data?.summary ? String(m.data.summary) : undefined,
      });
    }

    // Track reflections and journal
    if (m.type === 'reflection:completed') {
      reflections++;
    }
    if (m.type === 'journal:written') {
      journalEntries++;
    }
  }

  // Sort memories by importance, keep top 10
  memories.sort((a, b) => b.importance - a.importance);
  const topMemories = memories.slice(0, 10);

  // Generate status
  const session = gameSessions.get(sessionId);
  let status = '';
  if (session) {
    if (session.deaths > 0 && session.deaths >= session.agentCount) {
      status = 'COLONY COLLAPSED';
    } else if (session.deaths > session.agentCount / 2) {
      status = 'STRUGGLING';
    } else if (buildings.some(b => b.completed)) {
      status = 'BUILDING';
    } else if (goalsAchieved.length > 0) {
      status = 'ACHIEVING GOALS';
    } else if (Object.keys(resourcesGathered).length > 0) {
      status = 'GATHERING';
    } else {
      status = 'STARTING';
    }
  }

  const topActivities = Object.entries(activities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) as [string, number][];

  return {
    agents: Array.from(agents),
    agentNames,
    buildings,
    buildingsByType,
    relationships,
    resourcesGathered,
    resourcesConsumed,
    resourceDestinations,
    topActivities,
    deathCauses,
    status,
    foodConsumed,
    sleepEvents,
    weatherChanges,
    timeEvents,
    exploration,
    memories: topMemories,
    beliefs: beliefs.slice(0, 10),
    goalsAchieved,
    reflections,
    journalEntries,
  };
}

/**
 * Build ViewContext for dashboard views.
 * Views can work with historical session metrics since we don't have direct World access.
 */
function buildViewContext(sessionId?: string): ViewContext {
  const context: ViewContext = {
    world: undefined, // No direct World access in metrics server
  };

  // If session ID provided, include session metrics
  if (sessionId) {
    const metrics = getSessionMetrics(sessionId);
    context.sessionMetrics = metrics;
  }

  return context;
}

function generateSessionChooser(limit = 10): string {
  const now = Date.now();
  const allSessions = getAllSessions();

  // Separate game sessions from test sessions
  const gameSessions = allSessions.filter(s => !s.isTest);
  const testSessions = allSessions.filter(s => s.isTest);

  // Filter out empty game sessions older than 1 minute
  const allValidSessions = gameSessions.filter(s => {
    if (s.eventCount > 0) return true;
    const age = now - s.startTime;
    return age < 60000;
  });

  // Limit to most recent
  const sessions = allValidSessions.slice(0, limit);
  const hasMore = allValidSessions.length > limit;

  // Count active vs ended (from all valid sessions)
  const activeSessions = allValidSessions.filter(s => !s.endTime || (now - s.endTime < 30000));
  const endedSessions = allValidSessions.filter(s => s.endTime && (now - s.endTime >= 30000));

  let output = `AI VILLAGE - SESSION STATUS
Generated: ${formatTimestamp(now)}

LIVE: ${activeSessions.length}  |  ENDED: ${endedSessions.length}  |  TESTS: ${testSessions.length}
Showing: ${sessions.length} of ${allValidSessions.length} sessions${hasMore ? ` (use ?limit=N to see more)` : ''}

`;

  if (sessions.length === 0) {
    output += `No sessions yet. Start: npm run metrics-server && cd demo && npm run dev\n\n`;
  } else {
    // Table header
    output += `${'STATUS'.padEnd(8)} ${'SESSION'.padEnd(28)} ${'AGENTS'.padStart(7)} ${'ANIMALS'.padStart(8)} ${'BUILDINGS'.padStart(10)} ${'DURATION'.padStart(9)} ${'URL'}\n`;
    output += `${'-'.repeat(8)} ${'-'.repeat(28)} ${'-'.repeat(7)} ${'-'.repeat(8)} ${'-'.repeat(10)} ${'-'.repeat(9)} ${'-'.repeat(60)}\n`;

    for (const session of sessions) {
      const duration = session.endTime
        ? Math.floor((session.endTime - session.startTime) / 1000)
        : Math.floor((now - session.startTime) / 1000);
      const isActive = !session.endTime || (now - session.endTime < 30000);
      const summary = getSessionSummary(session.id);

      const status = isActive ? 'LIVE' : 'ENDED';
      const shortId = session.id.slice(0, 28);
      const agents = summary.agents.length;

      // Count animals from metrics
      const metrics = sessionMetrics.get(session.id) || [];
      const animals = new Set(
        metrics
          .filter(m => m.type === 'animal_spawned' || m.type === 'animal:tamed')
          .map(m => m.data?.animalId || m.data?.entityId)
          .filter(Boolean)
      ).size;

      const buildings = summary.buildings.filter(b => b.completed).length;
      const durationStr = `${Math.floor(duration / 60)}m${duration % 60}s`;
      const url = `http://localhost:${HTTP_PORT}/dashboard?session=${session.id}`;

      output += `${status.padEnd(8)} ${shortId.padEnd(28)} ${String(agents).padStart(7)} ${String(animals).padStart(8)} ${String(buildings).padStart(10)} ${durationStr.padStart(9)} ${url}\n`;
    }
  }

  output += `
COMMANDS
  Latest:     curl http://localhost:${HTTP_PORT}/dashboard?session=latest
  All:        curl http://localhost:${HTTP_PORT}/dashboard
  Agent info: curl http://localhost:${HTTP_PORT}/dashboard/agent?id=<agentId>
`;

  return output;
}

function generateTestSessionsList(): string {
  const now = Date.now();
  const allSessions = getAllSessions();
  const testSessions = allSessions.filter(s => s.isTest);

  let output = `================================================================================
AI VILLAGE - TEST SESSION BROWSER
================================================================================
Generated: ${formatTimestamp(now)}

  TOTAL TEST SESSIONS: ${testSessions.length}

`;

  if (testSessions.length === 0) {
    output += `## NO TEST SESSIONS
---------------------------------------------------------------------------
  No test sessions recorded yet. Test sessions are automatically detected
  when running via Vitest, Jest, or when NODE_ENV=test.

`;
  } else {
    for (const session of testSessions) {
      const startDate = new Date(session.startTime);
      const duration = session.endTime
        ? Math.floor((session.endTime - session.startTime) / 1000)
        : Math.floor((now - session.startTime) / 1000);

      const isActive = !session.endTime || (now - session.endTime < 30000);
      const liveIndicator = isActive ? '>>> RUNNING <<<' : '   FINISHED   ';

      output += `
================================================================================
  ${liveIndicator}  |  TEST RUN
  Session: ${session.id}
================================================================================
  Started:  ${startDate.toLocaleString()}
  Duration: ${Math.floor(duration / 60)}m ${duration % 60}s
  Events:   ${session.eventCount}
  Agents:   ${session.agentCount}
  Deaths:   ${session.deaths}

  View details: curl http://localhost:${HTTP_PORT}/dashboard?session=${session.id}

`;
    }
  }

  output += `================================================================================
NOTES
================================================================================
  Test sessions are automatically excluded from the main dashboard to prevent
  confusion between test metrics and real gameplay data.

  To view game sessions: curl http://localhost:${HTTP_PORT}/
================================================================================
`;

  return output;
}

function generateSessionList(): string {
  const sessions = getAllSessions();
  const now = Date.now();

  let output = `AI VILLAGE - SESSION LIST
=========================

`;

  for (const session of sessions) {
    const startDate = new Date(session.startTime);
    const isActive = !session.endTime || (now - session.endTime < 30000);

    output += `[${session.id}]
  Status: ${isActive ? 'ACTIVE' : 'ENDED'}
  Started: ${startDate.toISOString()}
  Events: ${session.eventCount}
  Agents: ${session.agentCount}
  Deaths: ${session.deaths}

`;
  }

  return output;
}

// ============================================================
// Session Persistence (File-based)
// ============================================================

const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

function saveSessionToDisk(sessionId: string): void {
  const session = gameSessions.get(sessionId);
  const metrics = sessionMetrics.get(sessionId);

  if (!session) return;

  const sessionFile = path.join(SESSIONS_DIR, `${sessionId}.json`);
  const data = {
    session,
    metrics: metrics || [],
  };

  try {
    fs.writeFileSync(sessionFile, JSON.stringify(data, null, 2));
    console.log(`[${new Date().toISOString()}] Saved session ${sessionId} (${session.eventCount} events)`);
  } catch (err) {
    console.error(`Failed to save session ${sessionId}:`, err);
  }
}

function loadSessionFromDisk(sessionId: string): boolean {
  const sessionFile = path.join(SESSIONS_DIR, `${sessionId}.json`);

  if (!fs.existsSync(sessionFile)) return false;

  try {
    const data = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
    gameSessions.set(sessionId, data.session);
    sessionMetrics.set(sessionId, data.metrics || []);
    return true;
  } catch (err) {
    console.error(`Failed to load session ${sessionId}:`, err);
    return false;
  }
}

function loadAllSessionsFromDisk(): void {
  if (!fs.existsSync(SESSIONS_DIR)) return;

  const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const sessionId = file.replace('.json', '');
    loadSessionFromDisk(sessionId);
  }

  console.log(`Loaded ${gameSessions.size} sessions from disk`);
}

function saveAllSessionsToDisk(): void {
  for (const sessionId of gameSessions.keys()) {
    saveSessionToDisk(sessionId);
  }
}

/**
 * Clean up old session files to prevent disk space bloat
 * Only removes very old temporary/test sessions
 */
function cleanupOldSessions(): void {
  if (!fs.existsSync(SESSIONS_DIR)) return;

  const MAX_SESSION_FILES = 200; // Keep last 200 sessions (much more generous)
  const MAX_FILE_SIZE_MB = 500; // Only delete truly massive files over 500MB
  const MAX_AGE_DAYS = 90; // Delete files older than 90 days (3 months)

  try {
    const files = fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const filePath = path.join(SESSIONS_DIR, f);
        const stats = fs.statSync(filePath);
        return {
          name: f,
          path: filePath,
          mtime: stats.mtime,
          size: stats.size,
        };
      })
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()); // Sort newest first

    let deletedCount = 0;
    let freedBytes = 0;

    // Delete files older than MAX_AGE_DAYS
    const cutoffDate = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
    for (const file of files) {
      if (file.mtime < cutoffDate) {
        fs.unlinkSync(file.path);
        deletedCount++;
        freedBytes += file.size;
      }
    }

    // Delete files larger than MAX_FILE_SIZE_MB
    for (const file of files) {
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > MAX_FILE_SIZE_MB && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
        deletedCount++;
        freedBytes += file.size;
      }
    }

    // Keep only the most recent MAX_SESSION_FILES
    const filesToDelete = files.slice(MAX_SESSION_FILES);
    for (const file of filesToDelete) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
        deletedCount++;
        freedBytes += file.size;
      }
    }

    if (deletedCount > 0) {
      const freedMB = (freedBytes / (1024 * 1024)).toFixed(2);
      console.log(`[Cleanup] Deleted ${deletedCount} old session files, freed ${freedMB} MB`);
    }
  } catch (err) {
    console.error('Failed to cleanup old sessions:', err);
  }
}

/**
 * Clean up old canon event files
 */
function cleanupOldCanonEvents(): void {
  if (!fs.existsSync(CANON_DIR)) return;

  const MAX_CANON_AGE_DAYS = 180; // Keep canon events for 180 days (6 months)

  try {
    const sessionDirs = fs.readdirSync(CANON_DIR).filter(f => {
      const fullPath = path.join(CANON_DIR, f);
      return fs.statSync(fullPath).isDirectory();
    });

    let deletedFiles = 0;
    let freedBytes = 0;
    const cutoffDate = new Date(Date.now() - MAX_CANON_AGE_DAYS * 24 * 60 * 60 * 1000);

    for (const sessionDir of sessionDirs) {
      const sessionPath = path.join(CANON_DIR, sessionDir);
      const files = fs.readdirSync(sessionPath);

      for (const file of files) {
        const filePath = path.join(sessionPath, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime < cutoffDate) {
          freedBytes += stats.size;
          fs.unlinkSync(filePath);
          deletedFiles++;
        }
      }

      // Remove empty directories
      if (fs.readdirSync(sessionPath).length === 0) {
        fs.rmdirSync(sessionPath);
      }
    }

    if (deletedFiles > 0) {
      const freedMB = (freedBytes / (1024 * 1024)).toFixed(2);
      console.log(`[Cleanup] Deleted ${deletedFiles} old canon event files, freed ${freedMB} MB`);
    }
  } catch (err) {
    console.error('Failed to cleanup old canon events:', err);
  }
}

// Load existing sessions on startup
loadAllSessionsFromDisk();

// ============================================================
// Canon Event Management - Multiverse Bridge Infrastructure
// ============================================================

/**
 * Save a canon event to disk with compression
 */
async function saveCanonEventToDisk(sessionId: string, event: CanonEvent): Promise<void> {
  const sessionDir = path.join(CANON_DIR, sessionId);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  // Save metadata (small, uncompressed for quick access)
  const metadataFile = path.join(sessionDir, `${event.id}_metadata.json`);
  const metadata = {
    id: event.id,
    type: event.type,
    timestamp: event.timestamp,
    tick: event.tick,
    day: event.day,
    description: event.description,
    agentIds: event.agentIds,
    agentNames: event.agentNames,
    eventData: event.eventData,
    genealogy: event.genealogy,
  };
  await fs.promises.writeFile(metadataFile, JSON.stringify(metadata, null, 2));

  // Save full snapshot (compressed)
  const snapshotFile = path.join(sessionDir, `${event.id}_snapshot.json.gz`);
  const snapshotJson = JSON.stringify(event.snapshot);
  const compressed = await gzip(Buffer.from(snapshotJson));
  await fs.promises.writeFile(snapshotFile, compressed);

  // Save runtime definitions
  const runtimeFile = path.join(sessionDir, `${event.id}_runtime.json`);
  await fs.promises.writeFile(runtimeFile, JSON.stringify(event.runtimeDefinitions, null, 2));

  console.log(`[Canon] Saved event ${event.id} for session ${sessionId}`);
}

/**
 * Load a canon event from disk
 */
async function loadCanonEventFromDisk(sessionId: string, eventId: string): Promise<CanonEvent | null> {
  const sessionDir = path.join(CANON_DIR, sessionId);
  const metadataFile = path.join(sessionDir, `${eventId}_metadata.json`);
  const snapshotFile = path.join(sessionDir, `${eventId}_snapshot.json.gz`);
  const runtimeFile = path.join(sessionDir, `${eventId}_runtime.json`);

  if (!fs.existsSync(metadataFile) || !fs.existsSync(snapshotFile)) {
    return null;
  }

  try {
    // Load metadata
    const metadataJson = await fs.promises.readFile(metadataFile, 'utf-8');
    const metadata = JSON.parse(metadataJson);

    // Load compressed snapshot
    const compressed = await fs.promises.readFile(snapshotFile);
    const decompressed = await gunzip(compressed);
    const snapshot = JSON.parse(decompressed.toString());

    // Load runtime definitions
    let runtimeDefinitions = {
      recipes: [],
      items: [],
      sacredSites: [],
      landmarks: [],
      culturalBeliefs: [],
      customBuildings: [],
    };
    if (fs.existsSync(runtimeFile)) {
      const runtimeJson = await fs.promises.readFile(runtimeFile, 'utf-8');
      runtimeDefinitions = JSON.parse(runtimeJson);
    }

    return {
      ...metadata,
      snapshot,
      runtimeDefinitions,
    };
  } catch (error) {
    console.error(`[Canon] Failed to load event ${eventId}:`, error);
    return null;
  }
}

/**
 * Get all canon events for a session
 */
function getCanonEventsForSession(sessionId: string): CanonEvent[] {
  return sessionCanonEvents.get(sessionId) || [];
}

/**
 * Add a canon event (from WebSocket stream)
 */
async function addCanonEvent(sessionId: string, event: CanonEvent): Promise<void> {
  // Add to in-memory store
  if (!sessionCanonEvents.has(sessionId)) {
    sessionCanonEvents.set(sessionId, []);
  }
  sessionCanonEvents.get(sessionId)!.push(event);

  // Save to disk
  await saveCanonEventToDisk(sessionId, event);
}

/**
 * Load all canon events for a session from disk
 */
async function loadCanonEventsForSession(sessionId: string): Promise<void> {
  const sessionDir = path.join(CANON_DIR, sessionId);
  if (!fs.existsSync(sessionDir)) {
    return;
  }

  const files = await fs.promises.readdir(sessionDir);
  const metadataFiles = files.filter(f => f.endsWith('_metadata.json'));

  const events: CanonEvent[] = [];
  for (const file of metadataFiles) {
    const eventId = file.replace('_metadata.json', '');
    const event = await loadCanonEventFromDisk(sessionId, eventId);
    if (event) {
      events.push(event);
    }
  }

  // Sort by timestamp
  events.sort((a, b) => a.timestamp - b.timestamp);
  sessionCanonEvents.set(sessionId, events);

  console.log(`[Canon] Loaded ${events.length} canon events for session ${sessionId}`);
}

/**
 * Create export package for a canon event
 */
async function exportCanonEventPackage(sessionId: string, eventId: string): Promise<Buffer | null> {
  const event = await loadCanonEventFromDisk(sessionId, eventId);
  if (!event) {
    return null;
  }

  // Create package metadata
  const packageData = {
    version: 1,
    exportedAt: Date.now(),
    sourceSession: sessionId,
    event: {
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      tick: event.tick,
      day: event.day,
      description: event.description,
      agentIds: event.agentIds,
      agentNames: event.agentNames,
    },
    snapshot: event.snapshot,
    runtimeDefinitions: event.runtimeDefinitions,
    genealogy: event.genealogy,
    bridgeMetadata: {
      multiverseId: sessionId,
      allowsTravel: true,
      believerThreshold: 5,
      restrictions: ['ensouled_only'],
    },
  };

  // Compress entire package
  const json = JSON.stringify(packageData, null, 2);
  return await gzip(Buffer.from(json));
}

// ============================================================
// LLM Dashboard Generation Functions
// ============================================================

interface AgentStats {
  totalEvents: number;
  resourcesGathered: Record<string, number>;
  resourcesConsumed: Record<string, number>;
  activitiesPerformed: Record<string, number>;
  tilesVisited: number;
  conversationsStarted: number;
  deaths: string[];
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toISOString().replace('T', ' ').replace('Z', '');
}

function formatRelativeTime(ts: number, now: number): string {
  const diffMs = now - ts;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ${diffSec % 60}s ago`;
  return `${diffHour}h ${diffMin % 60}m ago`;
}

function generateDashboard(metrics: StoredMetric[], sessionId?: string): string {
  const now = Date.now();
  const sessionStart = metrics.length > 0 ? metrics[0].timestamp : now;
  const sessionDuration = now - sessionStart;

  // Aggregate stats
  const byType: Record<string, number> = {};
  const agentStats: Record<string, AgentStats> = {};
  const resourceFlow: Record<string, { gathered: number; consumed: number; produced: number }> = {};
  const timeline: Array<{ ts: number; event: string }> = [];

  // New diagnostic data
  const agentNames: Map<string, string> = new Map();
  const animalIds: Set<string> = new Set();
  const animalSpecies: Map<string, string> = new Map();
  const villagerIds: Set<string> = new Set();
  const agentLastActivity: Map<string, { activity: string; timestamp: number; details?: string }> = new Map();
  const llmDecisions: Array<{ agentId: string; timestamp: number; decision: string; reasoning: string }> = [];
  const buildingsInProgress: Map<string, { type: string; startedAt: number; builders: Set<string> }> = new Map();
  const completedBuildings: Array<{ type: string; completedAt: number }> = [];

  // Research tracking
  const researchInProgress: Map<string, { researchId: string; progress: number; researchers: string[]; startedAt: number }> = new Map();
  const researchCompleted: Array<{ researchId: string; completedAt: number; unlocks: string[] }> = [];

  // Skills tracking (per agent)
  const agentSkills: Map<string, Map<string, { level: number; xp: number }>> = new Map();
  const skillLevelUps: Array<{ agentId: string; skillId: string; newLevel: number; timestamp: number }> = [];

  // Village health tracking
  const needsCrises: Array<{ agentId: string; needType: string; timestamp: number }> = [];
  const starvationEvents: Array<{ agentId: string; timestamp: number }> = [];

  // Trade tracking
  const tradeEvents: Array<{ buyer: string; seller: string; item: string; price: number; timestamp: number }> = [];

  // LLM error tracking for dashboard
  const llmErrors: Array<{ agentId: string; error: string; errorType: string; timestamp: number }> = [];
  const llmContextEvents: Array<{ agentId: string; timestamp: number; behavior?: string }> = [];

  // Crafting tracking
  const craftingInProgress: Map<string, { recipeId: string; stationId: string; startedAt: number; agentId?: string }> = new Map();
  const craftingCompleted: Array<{ recipeId: string; itemId: string; amount: number; timestamp: number }> = [];

  // Farming tracking
  const plantStats = { planted: 0, mature: 0, harvested: 0, died: 0 };
  const cropsByType: Record<string, { growing: number; mature: number; dead: number }> = {};

  // Memory/cognition tracking
  const memoryStats = { formed: 0, consolidated: 0, retrieved: 0 };
  const recentMemories: Array<{ agentId: string; content: string; importance: number; timestamp: number }> = [];
  const reflectionCount = { total: 0, recent: 0 };

  for (const m of metrics) {
    byType[m.type] = (byType[m.type] || 0) + 1;

    // Track per-agent stats
    if (m.agentId) {
      if (!agentStats[m.agentId]) {
        agentStats[m.agentId] = {
          totalEvents: 0,
          resourcesGathered: {},
          resourcesConsumed: {},
          activitiesPerformed: {},
          tilesVisited: 0,
          conversationsStarted: 0,
          deaths: [],
        };
      }
      const agent = agentStats[m.agentId];
      agent.totalEvents++;

      const data = m.data || {};

      if (m.type === 'resource:gathered') {
        const resourceType = String(data.resourceType || 'unknown');
        const amount = Number(data.amount) || 1;
        agent.resourcesGathered[resourceType] = (agent.resourcesGathered[resourceType] || 0) + amount;

        if (!resourceFlow[resourceType]) resourceFlow[resourceType] = { gathered: 0, consumed: 0, produced: 0 };
        resourceFlow[resourceType].gathered += amount;
      }

      if (m.type === 'resource:consumed') {
        const resourceType = String(data.resourceType || 'unknown');
        const amount = Number(data.amount) || 1;
        agent.resourcesConsumed[resourceType] = (agent.resourcesConsumed[resourceType] || 0) + amount;

        if (!resourceFlow[resourceType]) resourceFlow[resourceType] = { gathered: 0, consumed: 0, produced: 0 };
        resourceFlow[resourceType].consumed += amount;
      }

      if (m.type === 'resource:produced') {
        const resourceType = String(data.resourceType || 'unknown');
        const amount = Number(data.amount) || 1;

        if (!resourceFlow[resourceType]) resourceFlow[resourceType] = { gathered: 0, consumed: 0, produced: 0 };
        resourceFlow[resourceType].produced += amount;
      }

      if (m.type === 'activity:started') {
        const activity = String(data.activity || 'unknown');
        agent.activitiesPerformed[activity] = (agent.activitiesPerformed[activity] || 0) + 1;
      }

      if (m.type === 'tile:visited' || m.type === 'exploration:wander_session') {
        agent.tilesVisited++;
      }

      if (m.type === 'conversation:started') {
        agent.conversationsStarted++;
      }

      if (m.type === 'agent:death') {
        agent.deaths.push(String(data.causeOfDeath || 'unknown'));
      }
    }

    // Collect diagnostic data
    const data = m.data || {};

    // Track agent names and types from birth events
    if (m.type === 'agent:birth' && m.agentId) {
      // Distinguish villagers from animals by presence of useLLM field
      const useLLM = data.useLLM !== undefined ? data.useLLM : (data.data as any)?.useLLM;

      if (useLLM !== undefined) {
        // This is a villager agent
        villagerIds.add(m.agentId);
        const name = data.name || (data.data as any)?.name;
        if (name) {
          agentNames.set(m.agentId, String(name));
        }
      } else {
        // This is an animal (no useLLM field)
        animalIds.add(m.agentId);
        // Try to get species from event data (defaults to 'wild' if not provided)
        const species = data.species || (data.data as any)?.species || 'wild';
        animalSpecies.set(m.agentId, String(species));
      }
    }

    // Track animals from animal_spawned events (separate from agent:birth)
    if (m.type === 'animal_spawned') {
      const entityId = data.animalId || (data.data as any)?.animalId || data.entityId || (data.data as any)?.entityId;
      if (entityId) {
        animalIds.add(entityId);
        const species = data.speciesId || (data.data as any)?.speciesId || data.species || (data.data as any)?.species || 'wild';
        animalSpecies.set(entityId, String(species));
      }
    }

    // Track agent activities - any event that indicates the agent is doing something
    // NOTE: memory:formed is excluded - it's not an activity, just background processing
    if (m.agentId) {
      const activityEvents = [
        'activity:started', 'resource:gathered', 'items:deposited', 'llm:decision',
        'conversation:started', 'building:complete', 'agent:llm_context',
        'navigation:arrived', 'behavior:change'
      ];
      if (activityEvents.includes(m.type)) {
        // Determine activity type from event
        let activity = 'unknown';
        if (m.type === 'activity:started') {
          activity = String((data.data as any)?.activity || data.activity || 'unknown');
        } else if (m.type === 'resource:gathered') {
          activity = 'gather';
        } else if (m.type === 'items:deposited') {
          activity = 'deposit';
        } else if (m.type === 'llm:decision') {
          activity = String((data.data as any)?.decision || data.decision || 'thinking');
        } else if (m.type === 'conversation:started') {
          activity = 'talking';
        } else if (m.type === 'building:complete') {
          activity = 'building';
        } else if (m.type === 'agent:llm_context') {
          activity = String((data.data as any)?.behavior || data.behavior || 'thinking');
        } else if (m.type === 'navigation:arrived') {
          activity = 'moving';
        } else if (m.type === 'behavior:change') {
          // behavior:change event has 'to' field for the new behavior
          activity = String((data.data as any)?.to || data.to || (data.data as any)?.behavior || data.behavior || 'acting');
        }

        agentLastActivity.set(m.agentId, {
          activity,
          timestamp: m.timestamp,
          details: String((data.data as any)?.target || data.target || '')
        });
      }
    }

    // Track LLM decisions
    if (m.type === 'llm:decision' && m.agentId) {
      const decisionData = (data.data as any) || data;
      const decision = String(decisionData.decision || decisionData.behavior || 'unknown');
      const reasoning = String(decisionData.reasoning || '');
      if (decision !== 'unknown' || reasoning) {
        llmDecisions.push({
          agentId: m.agentId,
          timestamp: m.timestamp,
          decision,
          reasoning
        });
      }
    }

    // Track LLM errors
    if (m.type === 'llm:error' && m.agentId) {
      const errData = (data.data as any) || data;
      llmErrors.push({
        agentId: m.agentId,
        error: String(errData.error || 'unknown error'),
        errorType: String(errData.errorType || 'unknown'),
        timestamp: m.timestamp,
      });
    }

    // Track LLM context events (prompts)
    if (m.type === 'agent:llm_context' && m.agentId) {
      const ctxData = (data.data as any) || data;
      llmContextEvents.push({
        agentId: m.agentId,
        timestamp: m.timestamp,
        behavior: ctxData.behavior ? String(ctxData.behavior) : undefined,
      });
    }

    // Track building progress
    if (m.type === 'task:started' && data.taskType === 'construction') {
      const buildingType = String(data.buildingType || 'unknown');
      const taskId = String(data.taskId || m.timestamp);
      buildingsInProgress.set(taskId, {
        type: buildingType,
        startedAt: m.timestamp,
        builders: new Set(m.agentId ? [m.agentId] : [])
      });
    }

    if (m.type === 'building:complete') {
      const buildingType = String(data.buildingType || (data.data as any)?.buildingType || 'unknown');
      completedBuildings.push({
        type: buildingType,
        completedAt: m.timestamp
      });
    }

    // Track research events
    if (m.type === 'research:started') {
      const researchId = String(data.researchId || '');
      const researchers = (data.researchers as string[]) || (m.agentId ? [m.agentId] : []);
      researchInProgress.set(researchId, {
        researchId,
        progress: 0,
        researchers,
        startedAt: m.timestamp
      });
    }
    if (m.type === 'research:progress') {
      const researchId = String(data.researchId || '');
      const progress = Number(data.progress) || 0;
      const existing = researchInProgress.get(researchId);
      if (existing) {
        existing.progress = progress;
      }
    }
    if (m.type === 'research:completed') {
      const researchId = String(data.researchId || '');
      const unlocks = (data.unlocks as Array<{ type: string; id: string }>) || [];
      researchInProgress.delete(researchId);
      researchCompleted.push({
        researchId,
        completedAt: m.timestamp,
        unlocks: unlocks.map(u => `${u.type}:${u.id}`)
      });
    }

    // Track skill level ups
    if (m.type === 'skill:level_up' && m.agentId) {
      const skillId = String(data.skillId || 'unknown');
      const newLevel = Number(data.newLevel) || 1;
      skillLevelUps.push({
        agentId: m.agentId,
        skillId,
        newLevel,
        timestamp: m.timestamp
      });
      // Update agent skills map
      if (!agentSkills.has(m.agentId)) {
        agentSkills.set(m.agentId, new Map());
      }
      agentSkills.get(m.agentId)!.set(skillId, { level: newLevel, xp: 0 });
    }
    if (m.type === 'skill:xp_gain' && m.agentId) {
      const skillId = String(data.skillId || 'unknown');
      const xp = Number(data.xp) || 0;
      if (!agentSkills.has(m.agentId)) {
        agentSkills.set(m.agentId, new Map());
      }
      const skills = agentSkills.get(m.agentId)!;
      const existing = skills.get(skillId) || { level: 0, xp: 0 };
      skills.set(skillId, { level: existing.level, xp: existing.xp + xp });
    }

    // Track needs crises
    if (m.type === 'need:critical' && m.agentId) {
      const needType = String(data.needType || 'unknown');
      needsCrises.push({
        agentId: m.agentId,
        needType,
        timestamp: m.timestamp
      });
    }
    if (m.type === 'agent:starved' && m.agentId) {
      starvationEvents.push({
        agentId: m.agentId,
        timestamp: m.timestamp
      });
    }

    // Track trades
    if (m.type === 'trade:buy' || m.type === 'trade:sell') {
      const buyer = String(data.buyerId || data.buyer || m.agentId || 'unknown');
      const seller = String(data.sellerId || data.seller || 'unknown');
      const item = String(data.itemId || data.item || 'unknown');
      const price = Number(data.price) || 0;
      tradeEvents.push({ buyer, seller, item, price, timestamp: m.timestamp });
    }

    // Track crafting
    if (m.type === 'crafting:job_started') {
      const jobId = String(data.jobId || m.timestamp);
      const recipeId = String(data.recipeId || 'unknown');
      const stationId = String(data.stationId || 'unknown');
      craftingInProgress.set(jobId, {
        recipeId,
        stationId,
        startedAt: m.timestamp,
        agentId: m.agentId
      });
    }
    if (m.type === 'crafting:job_completed' || m.type === 'crafting:completed') {
      const jobId = String(data.jobId || '');
      const recipeId = String(data.recipeId || 'unknown');
      const itemId = String(data.itemId || data.outputItemId || recipeId);
      const amount = Number(data.amount || data.quantity) || 1;
      craftingInProgress.delete(jobId);
      craftingCompleted.push({ recipeId, itemId, amount, timestamp: m.timestamp });
    }
    if (m.type === 'crafting:job_cancelled') {
      const jobId = String(data.jobId || '');
      craftingInProgress.delete(jobId);
    }

    // Track farming/plants
    if (m.type === 'plant:stageChanged') {
      const plantType = String(data.speciesId || data.plantType || 'unknown');
      const newStage = String(data.newStage || data.stage || '');
      if (!cropsByType[plantType]) {
        cropsByType[plantType] = { growing: 0, mature: 0, dead: 0 };
      }
      if (newStage === 'seedling' || newStage === 'growing') {
        cropsByType[plantType].growing++;
        plantStats.planted++;
      }
    }
    if (m.type === 'plant:mature') {
      const plantType = String(data.speciesId || data.plantType || 'unknown');
      if (!cropsByType[plantType]) {
        cropsByType[plantType] = { growing: 0, mature: 0, dead: 0 };
      }
      cropsByType[plantType].mature++;
      cropsByType[plantType].growing = Math.max(0, cropsByType[plantType].growing - 1);
      plantStats.mature++;
    }
    if (m.type === 'plant:died' || m.type === 'plant:dead') {
      const plantType = String(data.speciesId || data.plantType || 'unknown');
      if (!cropsByType[plantType]) {
        cropsByType[plantType] = { growing: 0, mature: 0, dead: 0 };
      }
      cropsByType[plantType].dead++;
      plantStats.died++;
    }
    if (m.type === 'resource:gathered' && String(data.resourceType || '').includes('crop')) {
      plantStats.harvested++;
    }

    // Track memories and cognition
    if (m.type === 'memory:formed' && m.agentId) {
      memoryStats.formed++;
      const content = String(data.content || data.description || '');
      const importance = Number(data.importance) || 0;
      if (importance >= 0.5 && content) {
        recentMemories.push({ agentId: m.agentId, content, importance, timestamp: m.timestamp });
      }
    }
    if (m.type === 'memory:consolidated') {
      memoryStats.consolidated++;
    }
    if (m.type === 'memory:retrieved') {
      memoryStats.retrieved++;
    }
    if (m.type === 'reflection:completed') {
      reflectionCount.total++;
      if (now - m.timestamp < 600000) { // Last 10 min
        reflectionCount.recent++;
      }
    }

    // Build timeline for notable events
    if (['agent:death', 'building:complete', 'conversation:started', 'relationship:formed',
         'task:started', 'agent:birth'].includes(m.type)) {
      let eventDesc = m.type;
      if (m.type === 'agent:birth') {
        // Show name for villagers or species for animals
        const name = data.name || (data.data as any)?.name;
        const species = data.species || (data.data as any)?.species;
        const useLLM = data.useLLM !== undefined ? data.useLLM : (data.data as any)?.useLLM;
        if (name) {
          eventDesc = `villager ${name} joined`;
        } else if (species) {
          eventDesc = `${species} spawned`;
        } else if (useLLM !== undefined) {
          eventDesc = `villager joined`;
        } else {
          eventDesc = `animal spawned`;
        }
      } else {
        if (m.agentId) eventDesc += ` (${agentNames.get(m.agentId) || m.agentId.slice(0, 8)})`;
      }
      if (data.causeOfDeath) eventDesc += `: ${data.causeOfDeath}`;
      if (data.buildingType) eventDesc += `: ${data.buildingType}`;
      if (data.taskType) eventDesc += `: ${data.taskType}`;
      timeline.push({ ts: m.timestamp, event: eventDesc });
    }
  }

  // Sort timeline chronologically
  timeline.sort((a, b) => a.ts - b.ts);

  // Generate the dashboard text
  let output = '';

  // Calculate key metrics for summary
  const llmRequestCount = byType['llm:request'] || 0;
  const llmDecisionCount = byType['llm:decision'] || 0;
  const llmFailureRate = llmRequestCount > 0 ? Math.round(((llmRequestCount - llmDecisionCount) / llmRequestCount) * 100) : 0;
  const buildingsCompleted = completedBuildings.length;
  const buildingsInProgressCount = buildingsInProgress.size;
  const totalGathered = Object.values(resourceFlow).reduce((sum, f) => sum + f.gathered, 0);
  const conversationCount = byType['conversation:started'] || 0;

  // Calculate session staleness
  const lastActivityTime = Math.max(...Array.from(agentLastActivity.values()).map(a => a.timestamp), 0);
  const lastEventTime = metrics.length > 0 ? metrics[metrics.length - 1].timestamp : now;
  const sessionIdleTime = now - Math.max(lastActivityTime, lastEventTime);
  const isStale = sessionIdleTime > 300000; // 5 minutes without activity
  const isVeryStale = sessionIdleTime > 3600000; // 1 hour

  // Calculate stuck agents for health (stuck = same behavior for > 2 min with no progress)
  const stuckAgentCount = Array.from(agentLastActivity.entries())
    .filter(([id, activity]) => {
      if (!villagerIds.has(id)) return false;
      const stuckTime = now - activity.timestamp;
      return stuckTime > 120000; // 2 minutes
    }).length;

  // Food deficit detection
  const foodTypes = ['berry', 'berries', 'apple', 'apples', 'bread', 'meat', 'fish', 'cooked_meat', 'vegetable_stew'];
  let foodGathered = 0;
  let foodConsumed = 0;
  for (const foodType of foodTypes) {
    if (resourceFlow[foodType]) {
      foodGathered += resourceFlow[foodType].gathered + resourceFlow[foodType].produced;
      foodConsumed += resourceFlow[foodType].consumed;
    }
  }
  const foodDeficit = foodConsumed > foodGathered && foodConsumed > 0;

  // Calculate health status - more comprehensive
  const healthCrisisCount = needsCrises.filter(c => now - c.timestamp < 300000).length;
  let healthStatus: string;
  if (starvationEvents.length > 0) {
    healthStatus = '🔴'; // Critical - deaths
  } else if (foodDeficit || healthCrisisCount > villagerIds.size / 2 || stuckAgentCount > villagerIds.size * 0.8) {
    healthStatus = '🟡'; // Warning - food issues or most agents stuck
  } else if (stuckAgentCount > villagerIds.size / 2) {
    healthStatus = '🟠'; // Concern - many stuck
  } else {
    healthStatus = '🟢'; // OK
  }

  // Research status for summary
  const researchStatus = researchInProgress.size > 0 ? `🔬${researchInProgress.size}` : researchCompleted.length > 0 ? `📚${researchCompleted.length}` : '';

  // Format duration nicely
  const formatDuration = (ms: number): string => {
    if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  };

  // Session status line
  let sessionStatus = formatDuration(sessionDuration);
  if (isVeryStale) {
    sessionStatus += ` | ⚠️ STALE (idle ${formatDuration(sessionIdleTime)})`;
  } else if (isStale) {
    sessionStatus += ` | idle ${formatDuration(sessionIdleTime)}`;
  }

  output += `================================================================================
AI VILLAGE DASHBOARD | ${sessionStatus}
================================================================================
`;

  // Quick status line - now includes health and research
  let statusLine = `Villagers: ${villagerIds.size} ${healthStatus}`;
  if (stuckAgentCount > 0 && !isVeryStale) statusLine += ` (${stuckAgentCount} stuck)`;
  statusLine += ` | LLM: ${llmDecisionCount}/${llmRequestCount}${llmFailureRate > 30 ? ` ⚠️${llmFailureRate}%` : ''}`;
  statusLine += ` | Buildings: ${buildingsCompleted}✓ ${buildingsInProgressCount}⏳`;
  if (researchStatus) statusLine += ` | ${researchStatus}`;
  statusLine += ` | Resources: ${totalGathered}`;
  if (foodDeficit) statusLine += ` | 🍎⚠️`;
  if (conversationCount > 0) statusLine += ` | 💬${conversationCount}`;
  output += statusLine + '\n\n';

  // Quick links at top for easy navigation
  if (sessionId) {
    output += `📍 /agents  /timeline  /resources  /agent?id=<ID>\n\n`;
  }

  // Resource flow - only show if there's data
  const hasResources = Object.keys(resourceFlow).length > 0;
  if (hasResources) {
    output += `## RESOURCES
`;
  output += `---------------------------------------------------------------------------
`;
  output += `  ${'Resource'.padEnd(20)} ${'Gathered'.padStart(10)} ${'Produced'.padStart(10)} ${'Consumed'.padStart(10)} ${'Net'.padStart(10)}\n`;
  output += `  ${'-'.repeat(20)} ${'-'.repeat(10)} ${'-'.repeat(10)} ${'-'.repeat(10)} ${'-'.repeat(10)}\n`;
    for (const [resource, flow] of Object.entries(resourceFlow)) {
      const net = flow.gathered + flow.produced - flow.consumed;
      const netStr = net >= 0 ? `+${net}` : String(net);
      output += `  ${resource.padEnd(20)} ${String(flow.gathered).padStart(10)} ${String(flow.produced).padStart(10)} ${String(flow.consumed).padStart(10)} ${netStr.padStart(10)}\n`;
    }
    output += '\n';
  }

  // Villagers only (filter out animals which show as UUIDs)
  output += `## VILLAGERS\n`;

  // Sort agents by most recent activity, then by total events
  const sortedAgents = Object.entries(agentStats)
    .filter(([id]) => villagerIds.has(id)) // Only show villagers, not animals
    .sort((a, b) => {
    const activityA = agentLastActivity.get(a[0]);
    const activityB = agentLastActivity.get(b[0]);
    if (activityA && activityB) {
      return activityB.timestamp - activityA.timestamp;
    }
    if (activityA) return -1;
    if (activityB) return 1;
    return b[1].totalEvents - a[1].totalEvents;
  });

  // Compact villager display with stuck detection
  for (const [agentId, stats] of sortedAgents.slice(0, 15)) {
    const activity = agentLastActivity.get(agentId);
    const agentName = agentNames.get(agentId) || agentId.slice(0, 8);

    let status = 'idle';
    let stuckIndicator = '';
    if (activity) {
      status = activity.activity;
      const stuckDuration = now - activity.timestamp;
      // Mark as stuck if same behavior for > 2 min
      if (stuckDuration > 120000) {
        stuckIndicator = ' ⚠️';
      }
      // Mark as very stuck if > 10 min
      if (stuckDuration > 600000) {
        stuckIndicator = ' 🔴';
      }
    }
    if (stats.deaths.length > 0) {
      status = `💀${stats.deaths[0]}`;
      stuckIndicator = '';
    }

    const timeAgo = activity ? formatRelativeTime(activity.timestamp, now) : '';
    output += `  ${agentName.padEnd(10)} ${status.padEnd(15)} ${timeAgo}${stuckIndicator}\n`;
  }
  if (sortedAgents.length > 15) {
    output += `  +${sortedAgents.length - 15} more\n`;
  }
  output += '\n';

  // Animals section - show species counts
  if (animalIds.size > 0) {
    // Count animals by species
    const speciesCounts: Record<string, number> = {};
    for (const [_, species] of animalSpecies) {
      speciesCounts[species] = (speciesCounts[species] || 0) + 1;
    }
    const speciesList = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1]);

    output += `## ANIMALS (${animalIds.size})\n`;
    for (const [species, count] of speciesList) {
      output += `  ${species}: ${count}\n`;
    }
    output += '\n';
  }

  // Building Progress - compact
  const buildingTypeCounts: Record<string, { inProgress: number; completed: number }> = {};
  for (const build of Array.from(buildingsInProgress.values())) {
    if (!buildingTypeCounts[build.type]) {
      buildingTypeCounts[build.type] = { inProgress: 0, completed: 0 };
    }
    buildingTypeCounts[build.type].inProgress++;
  }
  for (const build of completedBuildings) {
    if (!buildingTypeCounts[build.type]) {
      buildingTypeCounts[build.type] = { inProgress: 0, completed: 0 };
    }
    buildingTypeCounts[build.type].completed++;
  }

  if (Object.keys(buildingTypeCounts).length > 0) {
    output += `## BUILDINGS\n`;
    for (const [type, counts] of Object.entries(buildingTypeCounts)) {
      const status = counts.completed > 0 ? `${counts.completed}✓` : '';
      const inProg = counts.inProgress > 0 ? `${counts.inProgress}⏳` : '';
      output += `  ${type.padEnd(15)} ${status} ${inProg}\n`;
    }
    output += '\n';
  }

  // Research Section
  if (researchInProgress.size > 0 || researchCompleted.length > 0) {
    output += `## RESEARCH\n`;
    // Show in-progress research
    for (const [researchId, research] of researchInProgress) {
      const progressPct = Math.round(research.progress * 100);
      const researcherNames = research.researchers.map(id => agentNames.get(id) || id.slice(0, 6)).join(', ');
      output += `  ⏳ ${researchId.padEnd(20)} ${progressPct}% (${researcherNames})\n`;
    }
    // Show recently completed research
    const recentCompleted = researchCompleted.slice(-3);
    for (const research of recentCompleted) {
      const unlockStr = research.unlocks.length > 0 ? ` → ${research.unlocks.slice(0, 2).join(', ')}` : '';
      output += `  ✓ ${research.researchId.padEnd(20)}${unlockStr}\n`;
    }
    if (researchCompleted.length > 3) {
      output += `  +${researchCompleted.length - 3} completed earlier\n`;
    }
    output += '\n';
  }

  // Village Health Section
  const recentCrises = needsCrises.filter(c => now - c.timestamp < 300000); // Last 5 min
  const foodConsumedCount = Object.values(resourceFlow).reduce((sum, f) => sum + (f.consumed || 0), 0);
  const foodGatheredCount = resourceFlow['berries']?.gathered || 0 + resourceFlow['apple']?.gathered || 0;
  const hungerCrises = recentCrises.filter(c => c.needType === 'hunger').length;
  const energyCrises = recentCrises.filter(c => c.needType === 'energy').length;

  if (recentCrises.length > 0 || starvationEvents.length > 0) {
    output += `## VILLAGE HEALTH\n`;
    // Food security indicator
    const foodSecurityStatus = starvationEvents.length > 0 ? '🔴 CRITICAL' :
                               hungerCrises > villagerIds.size / 2 ? '🟡 LOW' : '🟢 OK';
    output += `  Food Security: ${foodSecurityStatus}`;
    if (hungerCrises > 0) output += ` (${hungerCrises} hungry)`;
    output += '\n';

    // Energy status
    if (energyCrises > 0) {
      output += `  Energy: 🟡 ${energyCrises} exhausted\n`;
    }

    // Recent starvation events
    if (starvationEvents.length > 0) {
      const recentStarvations = starvationEvents.slice(-3);
      for (const event of recentStarvations) {
        const name = agentNames.get(event.agentId) || event.agentId.slice(0, 8);
        output += `  💀 ${name} starved ${formatRelativeTime(event.timestamp, now)}\n`;
      }
    }
    output += '\n';
  }

  // Skills Section - aggregate skills across village
  if (agentSkills.size > 0) {
    // Aggregate skills across all agents
    const villageSkills: Map<string, { totalLevel: number; count: number; maxLevel: number }> = new Map();
    for (const [agentId, skills] of agentSkills) {
      if (!villagerIds.has(agentId)) continue;
      for (const [skillId, { level }] of skills) {
        const existing = villageSkills.get(skillId) || { totalLevel: 0, count: 0, maxLevel: 0 };
        villageSkills.set(skillId, {
          totalLevel: existing.totalLevel + level,
          count: existing.count + 1,
          maxLevel: Math.max(existing.maxLevel, level)
        });
      }
    }

    if (villageSkills.size > 0) {
      output += `## SKILLS\n`;
      // Sort by total level
      const sortedSkills = Array.from(villageSkills.entries())
        .sort((a, b) => b[1].totalLevel - a[1].totalLevel)
        .slice(0, 6);
      for (const [skillId, stats] of sortedSkills) {
        const avgLevel = (stats.totalLevel / stats.count).toFixed(1);
        output += `  ${skillId.padEnd(12)} avg:${avgLevel} max:${stats.maxLevel} (${stats.count} agents)\n`;
      }

      // Recent level ups
      const recentLevelUps = skillLevelUps.slice(-3);
      if (recentLevelUps.length > 0) {
        output += `  Recent:\n`;
        for (const levelUp of recentLevelUps) {
          const name = agentNames.get(levelUp.agentId) || levelUp.agentId.slice(0, 8);
          output += `    ${name} → ${levelUp.skillId} L${levelUp.newLevel}\n`;
        }
      }
      output += '\n';
    }
  }

  // Crafting Section
  if (craftingInProgress.size > 0 || craftingCompleted.length > 0) {
    output += `## CRAFTING\n`;
    // Show in-progress crafting
    for (const [jobId, job] of craftingInProgress) {
      const elapsed = formatDuration(now - job.startedAt);
      const crafter = job.agentId ? (agentNames.get(job.agentId) || job.agentId.slice(0, 6)) : 'auto';
      output += `  ⏳ ${job.recipeId.padEnd(18)} at ${job.stationId.slice(0, 10)} (${elapsed}, ${crafter})\n`;
    }
    // Show recently completed
    if (craftingCompleted.length > 0) {
      const recentCrafted = craftingCompleted.slice(-4);
      // Group by item
      const itemCounts: Record<string, number> = {};
      for (const craft of recentCrafted) {
        itemCounts[craft.itemId] = (itemCounts[craft.itemId] || 0) + craft.amount;
      }
      output += `  Completed: ${Object.entries(itemCounts).map(([item, count]) => `${item}${count > 1 ? ` x${count}` : ''}`).join(', ')}\n`;
    }
    output += '\n';
  }

  // Farming Section
  const hasFarmingActivity = plantStats.planted > 0 || plantStats.mature > 0 || Object.keys(cropsByType).length > 0;
  if (hasFarmingActivity) {
    output += `## FARMING\n`;
    output += `  🌱 ${plantStats.planted} planted | 🌾 ${plantStats.mature} mature | 🥬 ${plantStats.harvested} harvested`;
    if (plantStats.died > 0) {
      output += ` | 💀 ${plantStats.died} died`;
    }
    output += '\n';
    // Show crops by type
    const cropList = Object.entries(cropsByType).filter(([_, c]) => c.growing > 0 || c.mature > 0);
    if (cropList.length > 0) {
      for (const [crop, counts] of cropList.slice(0, 4)) {
        output += `  ${crop}: ${counts.growing} growing, ${counts.mature} ready\n`;
      }
    }
    output += '\n';
  }

  // Memory/Cognition Section
  const hasCognitionActivity = memoryStats.formed > 0 || reflectionCount.total > 0;
  if (hasCognitionActivity) {
    output += `## COGNITION\n`;
    output += `  Memories: ${memoryStats.formed} formed`;
    if (memoryStats.consolidated > 0) output += `, ${memoryStats.consolidated} consolidated`;
    output += '\n';
    if (reflectionCount.total > 0) {
      output += `  Reflections: ${reflectionCount.total} total`;
      if (reflectionCount.recent > 0) output += ` (${reflectionCount.recent} recent)`;
      output += '\n';
    }
    // Show important recent memories
    const topMemories = recentMemories
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 3);
    if (topMemories.length > 0) {
      output += `  Recent insights:\n`;
      for (const mem of topMemories) {
        const name = agentNames.get(mem.agentId) || mem.agentId.slice(0, 6);
        const truncated = mem.content.length > 50 ? mem.content.slice(0, 47) + '...' : mem.content;
        output += `    ${name}: "${truncated}"\n`;
      }
    }
    output += '\n';
  }

  // Trade Section
  if (tradeEvents.length > 0) {
    output += `## ECONOMY\n`;
    const totalVolume = tradeEvents.reduce((sum, t) => sum + t.price, 0);
    output += `  Trade volume: ${totalVolume} (${tradeEvents.length} transactions)\n`;
    // Recent trades
    const recentTrades = tradeEvents.slice(-3);
    for (const trade of recentTrades) {
      const buyerName = agentNames.get(trade.buyer) || trade.buyer.slice(0, 8);
      output += `  ${buyerName} bought ${trade.item} for ${trade.price}\n`;
    }
    output += '\n';
  }

  // LLM Decisions - compact, only show last 5
  if (llmDecisions.length > 0) {
    output += `## RECENT DECISIONS\n`;
    const recentDecisions = llmDecisions.slice(-5);
    for (const decision of recentDecisions) {
      const agentName = agentNames.get(decision.agentId) || decision.agentId.slice(0, 8);
      const timeAgo = formatRelativeTime(decision.timestamp, now);
      output += `  ${agentName.padEnd(10)} ${decision.decision.padEnd(15)} ${timeAgo}\n`;
    }
    if (llmDecisions.length > 5) {
      output += `  +${llmDecisions.length - 5} earlier\n`;
    }
    output += '\n';
  }

  // LLM Debug Section - shows call/decision ratio, errors, and helps debug agent behavior
  const llmAgents = new Set([...llmContextEvents.map(e => e.agentId), ...llmDecisions.map(d => d.agentId)]);
  const llmSuccessRate = llmContextEvents.length > 0
    ? Math.round((llmDecisions.length / llmContextEvents.length) * 100)
    : 0;

  if (llmContextEvents.length > 0 || llmErrors.length > 0) {
    output += `## LLM DEBUG (Language Model Interface)\n`;
    output += `  Calls: ${llmContextEvents.length} | Decisions: ${llmDecisions.length} | Errors: ${llmErrors.length}`;
    if (llmContextEvents.length > 0) {
      output += ` | Success: ${llmSuccessRate}%`;
    }
    output += '\n';

    // Show agents with LLM activity
    if (llmAgents.size > 0 && llmAgents.size <= 5) {
      const agentCalls: Map<string, { calls: number; decisions: number; errors: number }> = new Map();
      for (const ctx of llmContextEvents) {
        if (!agentCalls.has(ctx.agentId)) agentCalls.set(ctx.agentId, { calls: 0, decisions: 0, errors: 0 });
        agentCalls.get(ctx.agentId)!.calls++;
      }
      for (const dec of llmDecisions) {
        if (!agentCalls.has(dec.agentId)) agentCalls.set(dec.agentId, { calls: 0, decisions: 0, errors: 0 });
        agentCalls.get(dec.agentId)!.decisions++;
      }
      for (const err of llmErrors) {
        if (!agentCalls.has(err.agentId)) agentCalls.set(err.agentId, { calls: 0, decisions: 0, errors: 0 });
        agentCalls.get(err.agentId)!.errors++;
      }

      output += `  Per Agent:\n`;
      for (const [agentId, stats] of Array.from(agentCalls.entries()).slice(0, 5)) {
        const name = agentNames.get(agentId) || agentId.slice(0, 8);
        const successRate = stats.calls > 0 ? Math.round((stats.decisions / stats.calls) * 100) : 0;
        let status = '';
        if (stats.errors > 0) status = ' [ERRORS]';
        else if (successRate < 50 && stats.calls >= 2) status = ' [LOW SUCCESS]';
        output += `    ${name.padEnd(10)} ${stats.calls} calls, ${stats.decisions} decisions${status}\n`;
      }
    }

    // Show recent errors
    if (llmErrors.length > 0) {
      output += `  Recent Errors:\n`;
      const recentErrs = llmErrors.slice(-3);
      for (const err of recentErrs) {
        const name = agentNames.get(err.agentId) || err.agentId.slice(0, 8);
        const timeAgo = formatRelativeTime(err.timestamp, now);
        output += `    [${timeAgo}] ${name}: [${err.errorType}] ${err.error.slice(0, 50)}\n`;
      }
    }

    output += `  Inspect: curl http://localhost:${HTTP_PORT}/dashboard/agent?id=<ID>\n`;
    output += '\n';
  }

  // Detect issues only (not verbose stats)
  const SESSION_MIN_AGE = 60000;
  const STUCK_THRESHOLD = 120000;
  const stuckAgents: Array<{ agentId: string; lastActivity: number }> = [];

  if (sessionDuration >= SESSION_MIN_AGE) {
    for (const [agentId] of Object.entries(agentStats)) {
      if (animalIds.has(agentId)) continue;
      const lastActivity = agentLastActivity.get(agentId);
      if (lastActivity && (now - lastActivity.timestamp) > STUCK_THRESHOLD) {
        stuckAgents.push({ agentId, lastActivity: now - lastActivity.timestamp });
      }
    }
  }

  // Detect repetitive patterns
  const decisionsByAgent: Map<string, string[]> = new Map();
  for (const dec of llmDecisions) {
    if (!decisionsByAgent.has(dec.agentId)) {
      decisionsByAgent.set(dec.agentId, []);
    }
    decisionsByAgent.get(dec.agentId)!.push(dec.decision);
  }
  const repetitiveAgents: Array<{ agentId: string; pattern: string }> = [];
  for (const [agentId, decisions] of Array.from(decisionsByAgent.entries())) {
    if (decisions.length >= 3) {
      const lastThree = decisions.slice(-3);
      if (lastThree.every(d => d === lastThree[0])) {
        repetitiveAgents.push({ agentId, pattern: lastThree[0]! });
      }
    }
  }

  // Only show issues section if there are issues
  if (stuckAgents.length > 0 || repetitiveAgents.length > 0) {
    output += `## ⚠️ ISSUES\n`;
    if (stuckAgents.length > 0) {
      output += `  Stuck: ${stuckAgents.map(s => agentNames.get(s.agentId) || s.agentId.slice(0, 8)).slice(0, 5).join(', ')}\n`;
    }
    if (repetitiveAgents.length > 0) {
      output += `  Loops: ${repetitiveAgents.map(r => `${agentNames.get(r.agentId) || r.agentId.slice(0, 8)}→${r.pattern}`).slice(0, 3).join(', ')}\n`;
    }
    output += '\n';
  }

  // Compact timeline - only interesting events, skip births/spawns/animal spam
  const interestingEvents = timeline.filter(t =>
    !t.event.includes('agent:birth') &&
    !t.event.includes('agent:spawn') &&
    !t.event.startsWith('agent:birth') &&
    !t.event.includes('animal spawned') &&
    !t.event.includes('spawned')  // Skip all spawn events (animals)
  );

  // Deduplicate timeline - group same events within 5 seconds
  const deduplicatedTimeline: Array<{ ts: number; event: string; count: number }> = [];
  for (const item of interestingEvents) {
    const lastItem = deduplicatedTimeline[deduplicatedTimeline.length - 1];
    // Group if same event within 5 seconds
    if (lastItem && lastItem.event === item.event && Math.abs(lastItem.ts - item.ts) < 5000) {
      lastItem.count++;
    } else {
      deduplicatedTimeline.push({ ...item, count: 1 });
    }
  }

  if (deduplicatedTimeline.length > 0) {
    output += `## TIMELINE\n`;
    const recentInteresting = deduplicatedTimeline.slice(-6);
    for (const item of recentInteresting) {
      const countStr = item.count > 1 ? ` (x${item.count})` : '';
      output += `  ${formatRelativeTime(item.ts, now).padEnd(10)} ${item.event}${countStr}\n`;
    }
    if (deduplicatedTimeline.length > 6) {
      output += `  +${deduplicatedTimeline.length - 6} more\n`;
    }
    output += '\n';
  }

  // Chat feed - show recent conversation utterances
  const chatMessages = metrics
    .filter(m => m.type === 'conversation:utterance' && m.data?.message)
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-8);  // Show last 8 messages

  if (chatMessages.length > 0) {
    output += `## 💬 CHAT\n`;
    for (const msg of chatMessages) {
      const speakerName = agentNames.get(msg.agentId || '') || msg.data?.speakerId?.slice(0, 8) || '???';
      const timeAgo = formatRelativeTime(msg.timestamp, now);
      const message = msg.data?.message || '';
      // Truncate long messages
      const truncatedMsg = message.length > 60 ? message.slice(0, 57) + '...' : message;
      output += `  ${timeAgo.padEnd(10)} ${speakerName}: "${truncatedMsg}"\n`;
    }
    output += '\n';
  }

  // Detect critical issues only
  const deathCount = byType['agent:death'] || 0;
  const birthCount = byType['agent:birth'] || 0;
  const starvationDeaths = metrics.filter(m => m.type === 'agent:death' && m.data?.causeOfDeath === 'starvation').length;
  const duplicateBuildings = Object.entries(buildingTypeCounts).filter(([, counts]) => counts.inProgress > 1);

  // Collect warnings
  const warnings: string[] = [];
  if (starvationDeaths > 0) warnings.push(`💀 ${starvationDeaths} starved`);
  if (deathCount > birthCount && deathCount > 0) warnings.push(`📉 ${deathCount} deaths`);
  if (duplicateBuildings.length > 0) warnings.push(`🔁 duplicate: ${duplicateBuildings.map(([t]) => t).join(', ')}`);
  if (llmFailureRate > 50) warnings.push(`🤖 LLM ${llmFailureRate}% fail`);
  if (stuckAgents.length > villagerIds.size * 0.5 && stuckAgents.length > 0) warnings.push(`⏸️ ${stuckAgents.length} stuck`);

  if (warnings.length > 0) {
    output += `## WARNINGS\n`;
    for (const w of warnings) {
      output += `  ${w}\n`;
    }
    output += '\n';
  }

  // Common Issues Guide
  const hasIssues = duplicateBuildings.length > 0 || llmFailureRate > 50;
  if (hasIssues) {
    output += `## COMMON ISSUES & DEBUGGING TIPS
`;
    output += `---------------------------------------------------------------------------
`;

    if (llmRequestCount > llmDecisionCount * 2) {
      const failureRate = Math.round(((llmRequestCount - llmDecisionCount) / llmRequestCount) * 100);
      output += `  [LLM DECISION FAILURES - ${failureRate}% failure rate]\n`;
      output += `  - Check LLM provider connection and API keys\n`;
      output += `  - Review recent LLM requests for parsing errors\n`;
      output += `  - Check ResponseParser.ts for prompt/response format issues\n\n`;
    }

    if (duplicateBuildings.length > 0) {
      output += `  [DUPLICATE BUILDINGS]\n`;
      output += `  - Multiple agents starting same building type\n`;
      output += `  - Check StructuredPromptBuilder.ts getAvailableActions() filtering\n`;
      output += `  - Verify building count logic includes in-progress buildings\n\n`;
    }

    if (stuckAgents.length > Object.keys(agentStats).length * 0.7) {
      output += `  [AGENTS STUCK OR IDLE]\n`;
      output += `  - Check if agents are spawning with behaviors\n`;
      output += `  - Verify AgentBrainSystem is running and scheduling decisions\n`;
      output += `  - Look for errors in behavior execution\n\n`;
    }

    if (agentLastActivity.size < Object.keys(agentStats).length * 0.3) {
      output += `  [LOW ACTIVITY RECORDING]\n`;
      output += `  - activity:started events may not be firing\n`;
      output += `  - Check metrics emission in action handlers\n\n`;
    }
  }

  output += '\n';

  // Live Query System - Add universe/magic/divinity info if available
  output += `## LIVE QUERY SYSTEM
---------------------------------------------------------------------------
  Use the Live Query API to get real-time game state information:

  Universe:  curl http://localhost:${HTTP_PORT}/api/live/universe
  Magic:     curl http://localhost:${HTTP_PORT}/api/live/magic
  Divinity:  curl http://localhost:${HTTP_PORT}/api/live/divinity
  Entities:  curl http://localhost:${HTTP_PORT}/api/live/entities
  Entity:    curl "http://localhost:${HTTP_PORT}/api/live/entity?id=<entityId>"

  The Live Query system queries the running game in real-time via WebSocket.
  Queries are sent to the game client and responses are returned immediately.
  This provides access to full entity state, component data, and system info.

## LLM DEV TOOLS (Actions API)
---------------------------------------------------------------------------
  Perform dev actions on the running game (spawn agents, give items, etc.):

  List all actions:  curl http://localhost:${HTTP_PORT}/api/actions

  The Actions API allows you (the LLM) to modify the running game via POST
  requests. Spawn agents, teleport them, give items, set needs, create deities,
  grant spells, and more. See /api/actions for full documentation.

`;

  output += `---\n`;

  return output;
}

function generateTimeline(metrics: StoredMetric[]): string {
  const now = Date.now();
  let output = `AI VILLAGE EVENT TIMELINE
=========================
Generated: ${formatTimestamp(now)}

`;

  // Group by time buckets (1 minute each)
  const buckets: Map<number, StoredMetric[]> = new Map();

  for (const m of metrics) {
    const bucketKey = Math.floor(m.timestamp / 60000) * 60000;
    if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
    buckets.get(bucketKey)!.push(m);
  }

  const sortedBuckets = Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]);

  for (const [bucketTime, events] of sortedBuckets) {
    const time = new Date(bucketTime);
    const timeStr = time.toTimeString().slice(0, 8);

    output += `[${timeStr}] -----\n`;

    // Summarize events in this minute
    const typeCounts: Record<string, number> = {};
    for (const e of events) {
      typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
    }

    for (const [type, count] of Object.entries(typeCounts)) {
      output += `  ${type}: ${count}x\n`;
    }
    output += '\n';
  }

  output += `\n## LIVE QUERY SYSTEM
---------------------------------------------------------------------------
  Real-time game state queries (WebSocket to running game):

  curl http://localhost:${HTTP_PORT}/api/live/universe    # Universe config
  curl http://localhost:${HTTP_PORT}/api/live/magic       # Magic users & stats
  curl http://localhost:${HTTP_PORT}/api/live/divinity    # Gods & belief
  curl http://localhost:${HTTP_PORT}/api/live/entities    # All entities
  curl "http://localhost:${HTTP_PORT}/api/live/entity?id=<ID>"  # Specific entity

`;

  return output;
}

/**
 * Generate agent list/menu for a session (for /dashboard/agents)
 * This is a simple list showing agents with links to detailed views
 */
function generateAgentReport(metrics: StoredMetric[]): string {
  const now = Date.now();
  let output = `AI VILLAGE - AGENTS LIST
========================
Generated: ${formatTimestamp(now)}

This is a menu of agents in this session. Use curl to view detailed info.

`;

  // Build agent info from birth events and metrics
  interface AgentInfo {
    id: string;
    name: string;
    usesLLM: boolean;
    eventCount: number;
    firstSeen: number;
    lastSeen: number;
    isDead: boolean;
    currentBehavior?: string;
  }

  const agents: Map<string, AgentInfo> = new Map();
  const animalIds: Set<string> = new Set();

  // First pass: collect agent info from birth events and track animals
  for (const m of metrics) {
    // Track animal IDs from animal_spawned events
    if (m.type === 'animal_spawned') {
      const data = m.data as any;
      const entityId = data?.animalId || data?.entityId;
      if (entityId) {
        animalIds.add(entityId);
      }
    }

    // Track agents from agent:birth events (only those with useLLM or name are villagers)
    if (m.type === 'agent:birth' && m.agentId) {
      const data = m.data as any;
      // Only add as agent if they have useLLM defined (villager) OR have a name
      // Animals use agent:birth too but without useLLM field
      if (data?.useLLM !== undefined || data?.name) {
        agents.set(m.agentId, {
          id: m.agentId,
          name: data?.name ? String(data.name) : m.agentId.slice(0, 8),
          usesLLM: Boolean(data?.useLLM),
          eventCount: 0,
          firstSeen: m.timestamp,
          lastSeen: m.timestamp,
          isDead: false,
        });
      } else {
        // This is likely an animal - mark as such
        animalIds.add(m.agentId);
      }
    }
  }

  // Second pass: count events and track activity (only for known agents)
  for (const m of metrics) {
    if (!m.agentId) continue;
    // Skip animals
    if (animalIds.has(m.agentId)) continue;
    // Skip if not a known agent (don't auto-create from random events)
    if (!agents.has(m.agentId)) continue;

    const agent = agents.get(m.agentId)!;
    agent.eventCount++;
    if (m.timestamp < agent.firstSeen) agent.firstSeen = m.timestamp;
    if (m.timestamp > agent.lastSeen) agent.lastSeen = m.timestamp;

    // Track death
    if (m.type === 'agent:death') {
      agent.isDead = true;
    }

    // Track current behavior
    if (m.type === 'llm:decision' && m.data?.behavior) {
      agent.currentBehavior = String(m.data.behavior);
    }
  }

  if (agents.size === 0) {
    output += `No agents found in this session.\n\n`;
    output += `Tip: Start a game session to see agents here.\n`;
    return output;
  }

  // Sort agents: living first, then by name
  const sortedAgents = Array.from(agents.values()).sort((a, b) => {
    if (a.isDead !== b.isDead) return a.isDead ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  // Header
  output += `${'#'.padEnd(3)} ${'Name'.padEnd(12)} ${'ID'.padEnd(10)} ${'Type'.padEnd(6)} ${'Events'.padStart(7)} ${'Status'.padEnd(10)} ${'Last Activity'.padEnd(14)}\n`;
  output += `${'-'.repeat(3)} ${'-'.repeat(12)} ${'-'.repeat(10)} ${'-'.repeat(6)} ${'-'.repeat(7)} ${'-'.repeat(10)} ${'-'.repeat(14)}\n`;

  // List agents
  let index = 1;
  for (const agent of sortedAgents) {
    const type = agent.usesLLM ? 'LLM' : 'Script';
    const status = agent.isDead ? 'DEAD' : (agent.currentBehavior || 'Active');
    const lastActivity = formatRelativeTime(agent.lastSeen, now);

    output += `${String(index).padEnd(3)} ${agent.name.padEnd(12)} ${agent.id.slice(0, 8).padEnd(10)} ${type.padEnd(6)} ${String(agent.eventCount).padStart(7)} ${status.slice(0, 10).padEnd(10)} ${lastActivity.padEnd(14)}\n`;
    index++;
  }

  output += `\n`;
  output += `Total: ${agents.size} agents (${sortedAgents.filter(a => !a.isDead).length} alive, ${sortedAgents.filter(a => a.isDead).length} dead)\n`;
  output += `\n`;

  // Curl commands for each agent
  output += `## View Agent Details\n`;
  output += `---------------------------------------------------------------------------\n`;
  for (const agent of sortedAgents) {
    output += `${agent.name.padEnd(12)} curl http://localhost:${HTTP_PORT}/dashboard/agent?id=${agent.id}\n`;
  }

  output += `\n`;
  output += `## Navigation\n`;
  output += `---------------------------------------------------------------------------\n`;
  output += `Back to dashboard:  curl http://localhost:${HTTP_PORT}/dashboard\n`;
  output += `View resources:     curl http://localhost:${HTTP_PORT}/dashboard/resources\n`;
  output += `View timeline:      curl http://localhost:${HTTP_PORT}/dashboard/timeline\n`;

  output += `\n`;
  output += `## Live Query API (real-time)\n`;
  output += `---------------------------------------------------------------------------\n`;
  output += `Universe:   curl http://localhost:${HTTP_PORT}/api/live/universe\n`;
  output += `Magic:      curl http://localhost:${HTTP_PORT}/api/live/magic\n`;
  output += `Divinity:   curl http://localhost:${HTTP_PORT}/api/live/divinity\n`;
  output += `Entities:   curl http://localhost:${HTTP_PORT}/api/live/entities\n`;

  return output;
}

/**
 * Generate detailed agent info (for /dashboard/agent?id=<agentId>)
 */
function generateAgentDetail(metrics: StoredMetric[], agentId: string): string {
  const now = Date.now();

  // Filter metrics for this agent
  const agentMetrics = metrics.filter(m => m.agentId === agentId);

  if (agentMetrics.length === 0) {
    return `AI VILLAGE - AGENT DETAIL
===========================
Agent ID: ${agentId}

ERROR: No metrics found for this agent.

Available agents in this session:
${Array.from(new Set(metrics.filter(m => m.agentId).map(m => m.agentId))).join('\n')}
`;
  }

  // Extract agent information from events
  let agentName = agentId.slice(0, 8); // Default to shortened ID
  let usesLLM = false;
  let currentBehavior = 'unknown';
  let personality = '';
  let goals: string[] = [];
  let lastLLMContext = '';
  let lastLLMContextTimestamp = 0;
  let lastAgentState: {
    behavior?: string;
    behaviorState?: Record<string, unknown>;
    priorities?: Record<string, number>;
    plannedBuilds?: Array<{ buildingType: string }>;
    position?: { x: number; y: number };
    needs?: { hunger?: number; energy?: number; social?: number };
    inventory?: Array<{ item: string; qty: number }>;
    skills?: Record<string, number>;  // e.g. { building: 2, farming: 1 }
    personalGoal?: string;
    mediumTermGoal?: string;
    groupGoal?: string;
    lastThought?: string;
    recentSpeech?: string;
  } | null = null;

  // Track state changes
  const behaviorHistory: Array<{ behavior: string; timestamp: number; reason: string }> = [];
  const memories: Array<{ content: string; type: string; importance: number; timestamp: number }> = [];
  const beliefs: Array<{ content: string; confidence: number; timestamp: number }> = [];
  const goalsAchieved: Array<{ behavior: string; summary?: string; timestamp: number }> = [];
  const relationships: Array<{ partnerId: string; type: string; timestamp: number }> = [];
  const resourcesGathered: Record<string, number> = {};
  const resourcesConsumed: Record<string, number> = {};
  const conversations: Array<{ partnerId: string; timestamp: number }> = [];
  const sleepEvents: Array<{ type: string; timestamp: number }> = [];
  const llmDecisions: Array<{ decision: string; reasoning?: string; timestamp: number; behavior?: string }> = [];
  const craftingEvents: Array<{ recipeId: string; produced: Array<{ itemId: string; amount: number }>; quality?: number; timestamp: number }> = [];

  // Track all LLM context events for call history
  const llmContextHistory: Array<{ prompt: string; timestamp: number; state?: Record<string, unknown> }> = [];
  const llmErrors: Array<{ error: string; errorType: string; timestamp: number }> = [];

  for (const m of agentMetrics) {
    const data = m.data || {};

    // Agent birth/identity
    if (m.type === 'agent:birth') {
      if (data.name) agentName = String(data.name);
      if (data.useLLM !== undefined) usesLLM = Boolean(data.useLLM);
      if (data.personality) personality = String(data.personality);
      if (data.goals) goals = Array.isArray(data.goals) ? data.goals.map(String) : [];
    }

    // LLM context snapshots (comprehensive agent state)
    if (m.type === 'agent:llm_context') {
      // Handle double-nested data structure (data.data.X vs data.X)
      const nestedData = (data.data && typeof data.data === 'object') ? data.data as Record<string, unknown> : data;
      lastLLMContext = String(nestedData.context || data.context || '');
      lastLLMContextTimestamp = m.timestamp;
      if (nestedData.agentName || data.agentName) agentName = String(nestedData.agentName || data.agentName);
      lastAgentState = {
        behavior: (nestedData.behavior || data.behavior) as string | undefined,
        behaviorState: (nestedData.behaviorState || data.behaviorState) as Record<string, unknown> | undefined,
        priorities: (nestedData.priorities || data.priorities) as Record<string, number> | undefined,
        plannedBuilds: (nestedData.plannedBuilds || data.plannedBuilds) as Array<{ buildingType: string }> | undefined,
        position: (nestedData.position || data.position) as { x: number; y: number } | undefined,
        needs: (nestedData.needs || data.needs) as { hunger?: number; energy?: number; social?: number } | undefined,
        inventory: (nestedData.inventory || data.inventory) as Array<{ item: string; qty: number }> | undefined,
        skills: (nestedData.skills || data.skills) as Record<string, number> | undefined,
        personalGoal: (nestedData.personalGoal || data.personalGoal) as string | undefined,
        mediumTermGoal: (nestedData.mediumTermGoal || data.mediumTermGoal) as string | undefined,
        groupGoal: (nestedData.groupGoal || data.groupGoal) as string | undefined,
        lastThought: (nestedData.lastThought || data.lastThought) as string | undefined,
        recentSpeech: (nestedData.recentSpeech || data.recentSpeech) as string | undefined,
      };

      // Also add to context history for LLM call pairing
      llmContextHistory.push({
        prompt: lastLLMContext,
        timestamp: m.timestamp,
        state: lastAgentState ? { ...lastAgentState } : undefined,
      });
    }

    // LLM decisions
    if (m.type === 'llm:decision') {
      llmDecisions.push({
        decision: String(data.decision || data.behavior || 'unknown'),
        reasoning: data.reasoning ? String(data.reasoning) : undefined,
        timestamp: m.timestamp,
        behavior: data.behavior ? String(data.behavior) : undefined,
      });
    }

    // LLM errors
    if (m.type === 'llm:error') {
      llmErrors.push({
        error: String(data.error || 'unknown error'),
        errorType: String(data.errorType || 'unknown'),
        timestamp: m.timestamp,
      });
    }

    // Behavior changes
    if (m.type === 'activity:started' || m.type === 'behavior:change') {
      currentBehavior = String(data.activity || data.to || 'unknown');
      behaviorHistory.push({
        behavior: currentBehavior,
        timestamp: m.timestamp,
        reason: String(data.reason || ''),
      });
    }

    // Memory formation
    if (m.type === 'memory:formed') {
      memories.push({
        content: String(data.content || ''),
        type: String(data.memoryType || 'unknown'),
        importance: Number(data.importance) || 0,
        timestamp: m.timestamp,
      });
    }

    // Belief formation
    if (m.type === 'belief:formed') {
      beliefs.push({
        content: String(data.content || ''),
        confidence: Number(data.confidence) || 0,
        timestamp: m.timestamp,
      });
    }

    // Goals achieved
    if (m.type === 'goal:achieved') {
      goalsAchieved.push({
        behavior: String(data.behavior || 'unknown'),
        summary: data.summary ? String(data.summary) : undefined,
        timestamp: m.timestamp,
      });
    }

    // Relationships
    if (m.type === 'relationship:formed') {
      relationships.push({
        partnerId: String(data.partnerId || data.otherAgentId || 'unknown'),
        type: String(data.relationshipType || 'acquaintance'),
        timestamp: m.timestamp,
      });
    }

    // Resources
    if (m.type === 'resource:gathered') {
      const resource = String(data.resourceType || 'unknown');
      const amount = Number(data.amount) || 1;
      resourcesGathered[resource] = (resourcesGathered[resource] || 0) + amount;
    }

    if (m.type === 'resource:consumed') {
      const resource = String(data.resourceType || 'unknown');
      const amount = Number(data.amount) || 1;
      resourcesConsumed[resource] = (resourcesConsumed[resource] || 0) + amount;
    }

    // Conversations
    if (m.type === 'conversation:started') {
      conversations.push({
        partnerId: String(data.partnerId || data.agent2 || 'unknown'),
        timestamp: m.timestamp,
      });
    }

    // Sleep events
    if (m.type === 'agent:sleep_start' || m.type === 'agent:woke' || m.type === 'agent:collapsed') {
      sleepEvents.push({
        type: m.type.replace('agent:', ''),
        timestamp: m.timestamp,
      });
    }

    // Crafting events
    if (m.type === 'crafting:completed') {
      craftingEvents.push({
        recipeId: String(data.recipeId || 'unknown'),
        produced: Array.isArray(data.produced) ? data.produced : [],
        quality: data.quality as number | undefined,
        timestamp: m.timestamp,
      });
    }
  }

  // Build output
  let output = `================================================================================
AI VILLAGE - AGENT DETAIL
================================================================================
Generated: ${formatTimestamp(now)}

  IDENTITY
  --------
    ID:          ${agentId}
    Name:        ${agentName}
    Uses LLM:    ${usesLLM ? 'Yes' : 'No'}
`;

  if (personality) {
    output += `    Personality: ${personality}\n`;
  }

  if (goals.length > 0) {
    output += `    Goals:       ${goals.join(', ')}\n`;
  }

  output += `
  CURRENT STATE
  -------------
    Behavior:    ${currentBehavior}
    Events:      ${agentMetrics.length} total
`;

  // Skills section (if available from lastAgentState)
  if (lastAgentState?.skills && Object.keys(lastAgentState.skills).length > 0) {
    output += `
  SKILLS
  ------
`;
    // Skill level names for display
    const SKILL_LEVEL_NAMES: Record<number, string> = {
      0: 'Untrained',
      1: 'Novice',
      2: 'Apprentice',
      3: 'Journeyman',
      4: 'Expert',
      5: 'Master',
    };
    const SKILL_ICONS: Record<string, string> = {
      building: '🏗️',
      farming: '🌾',
      gathering: '🪓',
      cooking: '🍳',
      crafting: '🔨',
      social: '💬',
      exploration: '🧭',
      combat: '⚔️',
      animal_handling: '🐾',
      medicine: '💊',
    };

    // Sort by level descending
    const sortedSkills = Object.entries(lastAgentState.skills)
      .sort(([, a], [, b]) => b - a);

    for (const [skillId, level] of sortedSkills) {
      const levelNum = Number(level);
      const levelName = SKILL_LEVEL_NAMES[levelNum] || `Level ${levelNum}`;
      const icon = SKILL_ICONS[skillId] || '📊';
      // Create progress bar
      const filled = '█'.repeat(levelNum);
      const empty = '░'.repeat(5 - levelNum);
      output += `    ${icon} ${skillId.padEnd(16)} [${filled}${empty}] ${levelName}\n`;
    }
  }

  // Behavior history (last 10)
  output += `
  BEHAVIOR HISTORY (recent)
  -------------------------
`;
  const recentBehaviors = behaviorHistory.slice(-10).reverse();
  if (recentBehaviors.length === 0) {
    output += `    No behavior changes recorded\n`;
  } else {
    for (const b of recentBehaviors) {
      const relTime = formatRelativeTime(b.timestamp, now);
      output += `    [${relTime.padEnd(12)}] ${b.behavior}`;
      if (b.reason) output += ` (${b.reason})`;
      output += '\n';
    }
  }

  // LLM Call History - shows prompt + decision pairs for debugging
  if (usesLLM || llmDecisions.length > 0 || llmContextHistory.length > 0) {
    output += `
  ================================================================================
  LLM CALL HISTORY (Language Model Interface Debug)
  ================================================================================
  Total LLM calls: ${llmContextHistory.length}
  Total decisions: ${llmDecisions.length}
  Total errors: ${llmErrors.length}
`;

    // Pair prompts with decisions (they should happen close together)
    // Show the most recent 3 pairs in detail
    const recentContexts = llmContextHistory.slice(-3).reverse();

    if (recentContexts.length === 0 && llmDecisions.length === 0) {
      output += `
  No LLM calls recorded yet. LLM calls happen when:
    - Agent is idle and needs a new goal
    - Agent completes current task
    - Periodic decision refresh
`;
    } else {
      for (let i = 0; i < recentContexts.length; i++) {
        const ctx = recentContexts[i];
        const relTime = formatRelativeTime(ctx.timestamp, now);

        // Find the closest decision after this prompt (within 10 seconds)
        const matchingDecision = llmDecisions.find(d =>
          d.timestamp >= ctx.timestamp && d.timestamp - ctx.timestamp < 10000
        );

        // Find any error around this time
        const matchingError = llmErrors.find(e =>
          e.timestamp >= ctx.timestamp && e.timestamp - ctx.timestamp < 10000
        );

        output += `
  --- LLM Call #${llmContextHistory.length - i} [${relTime}] ---
`;

        // Show state at time of call
        if (ctx.state) {
          const stateItems: string[] = [];
          if (ctx.state.behavior) stateItems.push(`behavior: ${ctx.state.behavior}`);
          if (ctx.state.needs) {
            const needs = ctx.state.needs as { hunger?: number; energy?: number; social?: number };
            const needsStr = Object.entries(needs)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => `${k}: ${Math.round((v as number) * 100)}%`)
              .join(', ');
            if (needsStr) stateItems.push(`needs: ${needsStr}`);
          }
          if (ctx.state.position) {
            const pos = ctx.state.position as { x: number; y: number };
            stateItems.push(`pos: (${pos.x}, ${pos.y})`);
          }
          if (stateItems.length > 0) {
            output += `  State: ${stateItems.join(' | ')}\n`;
          }
        }

        // Extract key instruction from prompt (first non-header line with substance)
        const promptLines = ctx.prompt.split('\n').filter(l => l.trim().length > 0);
        let instruction = '';
        for (const line of promptLines) {
          // Skip headers and identity lines
          if (line.startsWith('You are ') || line.startsWith('===') || line.startsWith('---')) continue;
          if (line.includes('VILLAGE STATE') || line.includes('CURRENT STATE')) continue;
          // Look for action-oriented lines
          if (line.includes('[') && line.includes(']')) {
            instruction = line.trim();
            break;
          }
          // Or lines with key context
          if (line.length > 20 && !instruction) {
            instruction = line.trim().slice(0, 100);
          }
        }
        if (instruction) {
          output += `  Instruction: "${instruction}${instruction.length >= 100 ? '...' : ''}"\n`;
        }

        // Show decision result
        if (matchingDecision) {
          output += `  Decision: ${matchingDecision.behavior || matchingDecision.decision}\n`;
          if (matchingDecision.reasoning) {
            const reasonShort = matchingDecision.reasoning.length > 100
              ? matchingDecision.reasoning.slice(0, 97) + '...'
              : matchingDecision.reasoning;
            output += `  Thinking: "${reasonShort}"\n`;
          }
        } else if (matchingError) {
          output += `  ERROR: [${matchingError.errorType}] ${matchingError.error.slice(0, 80)}\n`;
        } else {
          output += `  Result: (pending or no response captured)\n`;
        }
      }
    }

    // Show recent decisions summary
    if (llmDecisions.length > 0) {
      output += `
  Recent Decisions Summary:
`;
      const recentDecisions = llmDecisions.slice(-5).reverse();
      for (const d of recentDecisions) {
        const relTime = formatRelativeTime(d.timestamp, now);
        const decisionStr = d.behavior || d.decision;
        output += `    [${relTime.padEnd(10)}] ${decisionStr.padEnd(20)}`;
        if (d.reasoning) {
          const shortReason = d.reasoning.length > 40 ? d.reasoning.slice(0, 37) + '...' : d.reasoning;
          output += ` "${shortReason}"`;
        }
        output += '\n';
      }
    }

    // Show errors if any
    if (llmErrors.length > 0) {
      output += `
  LLM Errors:
`;
      const recentErrors = llmErrors.slice(-3).reverse();
      for (const err of recentErrors) {
        const relTime = formatRelativeTime(err.timestamp, now);
        output += `    [${relTime.padEnd(10)}] [${err.errorType}] ${err.error.slice(0, 60)}\n`;
      }
    }

    output += `
  ---------------------------------------------------------------------------
  To see full prompt, scroll to LLM PROMPT section below.
  For real-time prompt: curl "http://localhost:${HTTP_PORT}/api/live/prompt?id=${agentId}"
`;
  }

  // Resources
  output += `
  RESOURCES
  ---------
`;
  if (Object.keys(resourcesGathered).length === 0 && Object.keys(resourcesConsumed).length === 0) {
    output += `    No resource activity\n`;
  } else {
    const allResources = new Set([...Object.keys(resourcesGathered), ...Object.keys(resourcesConsumed)]);
    for (const resource of allResources) {
      const gathered = resourcesGathered[resource] || 0;
      const consumed = resourcesConsumed[resource] || 0;
      output += `    ${resource}: +${gathered} gathered, -${consumed} consumed (net: ${gathered - consumed})\n`;
    }
  }

  // Memories (top 5 by importance)
  output += `
  MEMORIES (by importance)
  ------------------------
`;
  if (memories.length === 0) {
    output += `    No memories recorded\n`;
  } else {
    memories.sort((a, b) => b.importance - a.importance);
    for (const mem of memories.slice(0, 5)) {
      const relTime = formatRelativeTime(mem.timestamp, now);
      const contentShort = mem.content.length > 60 ? mem.content.slice(0, 60) + '...' : mem.content;
      output += `    [${relTime.padEnd(12)}] (${mem.type}, imp=${mem.importance.toFixed(1)})\n`;
      output += `                     "${contentShort}"\n`;
    }
    if (memories.length > 5) {
      output += `    ... and ${memories.length - 5} more memories\n`;
    }
  }

  // Beliefs
  if (beliefs.length > 0) {
    output += `
  BELIEFS
  -------
`;
    for (const belief of beliefs.slice(-3)) {
      const relTime = formatRelativeTime(belief.timestamp, now);
      const contentShort = belief.content.length > 60 ? belief.content.slice(0, 60) + '...' : belief.content;
      output += `    [${relTime.padEnd(12)}] (conf=${belief.confidence.toFixed(1)})\n`;
      output += `                     "${contentShort}"\n`;
    }
  }

  // Goals achieved
  if (goalsAchieved.length > 0) {
    output += `
  GOALS ACHIEVED
  --------------
`;
    for (const goal of goalsAchieved.slice(-5)) {
      const relTime = formatRelativeTime(goal.timestamp, now);
      output += `    [${relTime.padEnd(12)}] ${goal.behavior}`;
      if (goal.summary) output += ` - ${goal.summary}`;
      output += '\n';
    }
  }

  // Relationships
  output += `
  RELATIONSHIPS
  -------------
`;
  if (relationships.length === 0) {
    output += `    No relationships formed\n`;
  } else {
    for (const rel of relationships) {
      const relTime = formatRelativeTime(rel.timestamp, now);
      output += `    [${relTime.padEnd(12)}] ${rel.type} with ${rel.partnerId.slice(0, 8)}\n`;
    }
  }

  // Conversations
  output += `
  SOCIAL (conversations)
  ----------------------
    Total conversations: ${conversations.length}
`;
  if (conversations.length > 0) {
    const recentConvos = conversations.slice(-5).reverse();
    for (const conv of recentConvos) {
      const relTime = formatRelativeTime(conv.timestamp, now);
      output += `    [${relTime.padEnd(12)}] Talked with ${conv.partnerId.slice(0, 8)}\n`;
    }
  }

  // Sleep
  if (sleepEvents.length > 0) {
    output += `
  SLEEP PATTERNS
  --------------
`;
    const recentSleep = sleepEvents.slice(-5).reverse();
    for (const sleep of recentSleep) {
      const relTime = formatRelativeTime(sleep.timestamp, now);
      output += `    [${relTime.padEnd(12)}] ${sleep.type}\n`;
    }
  }

  // Crafting
  if (craftingEvents.length > 0) {
    output += `
  CRAFTING HISTORY
  ----------------
`;
    // Quality tier names
    const QUALITY_TIERS: Record<number, string> = {
      1: 'Poor',
      2: 'Normal',
      3: 'Good',
      4: 'Excellent',
      5: 'Masterwork',
    };

    const recentCrafting = craftingEvents.slice(-5).reverse();
    for (const craft of recentCrafting) {
      const relTime = formatRelativeTime(craft.timestamp, now);
      const producedStr = craft.produced.map(p => `${p.itemId} x${p.amount}`).join(', ');
      const qualityStr = craft.quality ? ` [${QUALITY_TIERS[craft.quality] || `Q${craft.quality}`}]` : '';
      output += `    [${relTime.padEnd(12)}] ${craft.recipeId} → ${producedStr}${qualityStr}\n`;
    }
    if (craftingEvents.length > 5) {
      output += `    ... and ${craftingEvents.length - 5} more crafting events\n`;
    }
  }

  // Live Agent State (from last LLM context snapshot)
  if (lastAgentState) {
    output += `
  LIVE STATE (snapshot: ${formatRelativeTime(lastLLMContextTimestamp, now)})
  ---------------------------------------------------------------------------
`;
    // Position and behavior
    if (lastAgentState.position) {
      output += `    Position: (${lastAgentState.position.x}, ${lastAgentState.position.y})\n`;
    }
    output += `    Behavior: ${lastAgentState.behavior || 'unknown'}`;
    if (lastAgentState.behaviorState && Object.keys(lastAgentState.behaviorState).length > 0) {
      output += ` ${JSON.stringify(lastAgentState.behaviorState)}`;
    }
    output += '\n';

    // Needs (values are on 0-1 scale, convert to percentage)
    if (lastAgentState.needs) {
      const { hunger, energy, social } = lastAgentState.needs;
      const needsStr = [
        hunger !== undefined ? `Hunger: ${Math.round(hunger * 100)}%` : null,
        energy !== undefined ? `Energy: ${Math.round(energy * 100)}%` : null,
        social !== undefined ? `Social: ${Math.round(social * 100)}%` : null,
      ].filter(Boolean).join(' | ');
      if (needsStr) output += `    Needs: ${needsStr}\n`;
    }

    // Inventory
    if (lastAgentState.inventory && lastAgentState.inventory.length > 0) {
      const invStr = lastAgentState.inventory.map(i => `${i.qty}x ${i.item}`).join(', ');
      output += `    Inventory: ${invStr}\n`;
    }

    // Priorities
    if (lastAgentState.priorities && Object.keys(lastAgentState.priorities).length > 0) {
      const prioStr = Object.entries(lastAgentState.priorities)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k}: ${(v * 100).toFixed(0)}%`)
        .join(', ');
      output += `    Priorities: ${prioStr}\n`;
    }

    // Planned builds
    if (lastAgentState.plannedBuilds && lastAgentState.plannedBuilds.length > 0) {
      const buildsStr = lastAgentState.plannedBuilds.map(b => b.buildingType).join(', ');
      output += `    Planned Builds: ${buildsStr}\n`;
    }

    // Goals
    if (lastAgentState.personalGoal) {
      output += `    Personal Goal: ${lastAgentState.personalGoal}\n`;
    }
    if (lastAgentState.mediumTermGoal) {
      output += `    Medium-term Goal: ${lastAgentState.mediumTermGoal}\n`;
    }
    if (lastAgentState.groupGoal) {
      output += `    Group Goal: ${lastAgentState.groupGoal}\n`;
    }

    // Recent thoughts/speech
    if (lastAgentState.lastThought) {
      output += `    Last Thought: "${lastAgentState.lastThought.slice(0, 100)}${lastAgentState.lastThought.length > 100 ? '...' : ''}"\n`;
    }
    if (lastAgentState.recentSpeech) {
      output += `    Recent Speech: "${lastAgentState.recentSpeech}"\n`;
    }
  }

  // LLM Context (if available)
  if (lastLLMContext) {
    output += `
  LLM PROMPT (last snapshot: ${formatRelativeTime(lastLLMContextTimestamp, now)})
  ================================================================================
${lastLLMContext}
  ================================================================================
`;
  } else if (usesLLM) {
    output += `
  LLM PROMPT
  ----------
    No LLM context snapshot available yet.
    The game emits 'agent:llm_context' events when making LLM requests.
`;
  }

  output += `
================================================================================
LIVE QUERY - Get real-time entity state
================================================================================
  Full entity:     curl "http://localhost:${HTTP_PORT}/api/live/entity?id=${agentId}"
  All entities:    curl http://localhost:${HTTP_PORT}/api/live/entities
  Magic systems:   curl http://localhost:${HTTP_PORT}/api/live/magic
  Divinity:        curl http://localhost:${HTTP_PORT}/api/live/divinity
  Universe:        curl http://localhost:${HTTP_PORT}/api/live/universe

  The Live Query API queries the running game in real-time to get current
  component state (Magic, Spiritual, Skills, Inventory, etc.) for this agent.

================================================================================
COMMANDS
================================================================================
  Back to session: curl http://localhost:${HTTP_PORT}/
  All agents:      curl http://localhost:${HTTP_PORT}/dashboard/agents
================================================================================
`;

  return output;
}

function generateResourceReport(metrics: StoredMetric[]): string {
  const now = Date.now();
  let output = `AI VILLAGE RESOURCE FLOW REPORT
================================
Generated: ${formatTimestamp(now)}

`;

  // Track resource events over time
  const resourceEvents: Array<{ ts: number; resource: string; amount: number; type: 'in' | 'out' }> = [];

  for (const m of metrics) {
    const data = m.data || {};

    if (m.type === 'resource:gathered' || m.type === 'resource:produced') {
      resourceEvents.push({
        ts: m.timestamp,
        resource: String(data.resourceType || 'unknown'),
        amount: Number(data.amount) || 1,
        type: 'in',
      });
    }

    if (m.type === 'resource:consumed') {
      resourceEvents.push({
        ts: m.timestamp,
        resource: String(data.resourceType || 'unknown'),
        amount: Number(data.amount) || 1,
        type: 'out',
      });
    }
  }

  // Sort by time
  resourceEvents.sort((a, b) => a.ts - b.ts);

  // Running totals
  const totals: Record<string, number> = {};

  output += `Chronological Resource Flow:\n`;
  output += `-`.repeat(70) + '\n';

  for (const event of resourceEvents) {
    const sign = event.type === 'in' ? '+' : '-';
    totals[event.resource] = (totals[event.resource] || 0) + (event.type === 'in' ? event.amount : -event.amount);

    const timeStr = new Date(event.ts).toTimeString().slice(0, 8);
    output += `[${timeStr}] ${sign}${event.amount} ${event.resource} (total: ${totals[event.resource]})\n`;
  }

  output += '\n';
  output += `Final Totals:\n`;
  output += `-`.repeat(30) + '\n';
  for (const [resource, total] of Object.entries(totals)) {
    output += `  ${resource}: ${total}\n`;
  }

  output += `\n`;
  output += `## Live Query API (real-time game state)\n`;
  output += `---------------------------------------------------------------------------\n`;
  output += `Universe:   curl http://localhost:${HTTP_PORT}/api/live/universe\n`;
  output += `Magic:      curl http://localhost:${HTTP_PORT}/api/live/magic\n`;
  output += `Divinity:   curl http://localhost:${HTTP_PORT}/api/live/divinity\n`;
  output += `Entities:   curl http://localhost:${HTTP_PORT}/api/live/entities\n`;

  return output;
}

console.log(`
====================================
  Metrics Streaming Server
====================================
  WebSocket Port: ${PORT}
  HTTP Port: ${HTTP_PORT}
  Data Directory: ${DATA_DIR}

  LLM Dashboard: http://localhost:${HTTP_PORT}/dashboard
====================================
`);

// Helper to get metrics (optionally filtered by session)
function getMetricsForRequest(url: URL): StoredMetric[] {
  const sessionParam = url.searchParams.get('session');

  if (!sessionParam) {
    // No session specified - return all metrics
    return storage.getHotStorage();
  }

  if (sessionParam === 'latest') {
    // Get the most recent session
    const sessions = getAllSessions();
    if (sessions.length === 0) return [];
    return getSessionMetrics(sessions[0].id);
  }

  // Specific session
  return getSessionMetrics(sessionParam);
}

// ============================================================
// Action Handlers (for /api/actions/*)
// ============================================================

/**
 * Send an action command to the game client
 */
async function sendActionToGame(client: WebSocket, action: string, params: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const requestId = `action_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const message = {
      type: 'action',
      requestId,
      action,
      params,
    };

    // Set up response handler
    const timeout = setTimeout(() => {
      reject(new Error(`Action timeout: ${action}`));
    }, 10000);

    const handler = (data: Buffer) => {
      try {
        const response = JSON.parse(data.toString());
        if (response.requestId === requestId) {
          clearTimeout(timeout);
          client.off('message', handler);

          if (response.success) {
            resolve(response.data || { success: true });
          } else {
            reject(new Error(response.error || 'Action failed'));
          }
        }
      } catch (err) {
        // Ignore parse errors for other messages
      }
    };

    client.on('message', handler);
    client.send(JSON.stringify(message));
  });
}

async function handleSpawnAgent(client: WebSocket, params: Record<string, unknown>) {
  if (!params.name || typeof params.x !== 'number' || typeof params.y !== 'number') {
    throw new Error('Missing required parameters: name, x, y');
  }

  return sendActionToGame(client, 'spawn-agent', params);
}

async function handleTeleport(client: WebSocket, params: Record<string, unknown>) {
  if (!params.agentId || typeof params.x !== 'number' || typeof params.y !== 'number') {
    throw new Error('Missing required parameters: agentId, x, y');
  }

  return sendActionToGame(client, 'teleport', params);
}

async function handleSetNeed(client: WebSocket, params: Record<string, unknown>) {
  if (!params.agentId || !params.need || typeof params.value !== 'number') {
    throw new Error('Missing required parameters: agentId, need, value');
  }

  const validNeeds = ['hunger', 'energy', 'warmth', 'social', 'safety'];
  if (!validNeeds.includes(params.need as string)) {
    throw new Error(`Invalid need. Must be one of: ${validNeeds.join(', ')}`);
  }

  if (params.value < 0 || params.value > 1) {
    throw new Error('Value must be between 0.0 and 1.0');
  }

  return sendActionToGame(client, 'set-need', params);
}

async function handleGiveItem(client: WebSocket, params: Record<string, unknown>) {
  if (!params.agentId || !params.itemType) {
    throw new Error('Missing required parameters: agentId, itemType');
  }

  return sendActionToGame(client, 'give-item', {
    ...params,
    amount: params.amount || 1,
  });
}

async function handleTriggerBehavior(client: WebSocket, params: Record<string, unknown>) {
  if (!params.agentId || !params.behavior) {
    throw new Error('Missing required parameters: agentId, behavior');
  }

  return sendActionToGame(client, 'trigger-behavior', params);
}

async function handleSetSpeed(client: WebSocket, params: Record<string, unknown>) {
  if (typeof params.speed !== 'number') {
    throw new Error('Missing required parameter: speed');
  }

  if (params.speed < 0.1 || params.speed > 10) {
    throw new Error('Speed must be between 0.1 and 10.0');
  }

  return sendActionToGame(client, 'set-speed', params);
}

async function handlePause(client: WebSocket, params: Record<string, unknown>) {
  if (typeof params.paused !== 'boolean') {
    throw new Error('Missing required parameter: paused (boolean)');
  }

  return sendActionToGame(client, 'pause', params);
}

async function handleSpawnEntity(client: WebSocket, params: Record<string, unknown>) {
  if (!params.type || typeof params.x !== 'number' || typeof params.y !== 'number') {
    throw new Error('Missing required parameters: type, x, y');
  }

  return sendActionToGame(client, 'spawn-entity', params);
}

async function handleGrantSpell(client: WebSocket, params: Record<string, unknown>) {
  if (!params.agentId || !params.spellId) {
    throw new Error('Missing required parameters: agentId, spellId');
  }

  return sendActionToGame(client, 'grant-spell', params);
}

async function handleAddBelief(client: WebSocket, params: Record<string, unknown>) {
  if (!params.deityId || typeof params.amount !== 'number') {
    throw new Error('Missing required parameters: deityId, amount');
  }

  return sendActionToGame(client, 'add-belief', params);
}

async function handleCreateDeity(client: WebSocket, params: Record<string, unknown>) {
  if (!params.name) {
    throw new Error('Missing required parameter: name');
  }

  return sendActionToGame(client, 'create-deity', {
    ...params,
    controller: params.controller || 'dormant',
  });
}

async function handleSetLLMConfig(client: WebSocket, params: Record<string, unknown>) {
  if (!params.agentId) {
    throw new Error('Missing required parameter: agentId');
  }

  const config: Record<string, unknown> = {};

  if (params.baseUrl && typeof params.baseUrl === 'string') {
    config.baseUrl = params.baseUrl;
  }

  if (params.model && typeof params.model === 'string') {
    config.model = params.model;
  }

  if (params.apiKey && typeof params.apiKey === 'string') {
    config.apiKey = params.apiKey;
  }

  if (params.customHeaders && typeof params.customHeaders === 'object') {
    config.customHeaders = params.customHeaders;
  }

  return sendActionToGame(client, 'set-llm-config', {
    agentId: params.agentId,
    config,
  });
}

// HTTP Server for querying metrics
const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const url = new URL(req.url || '/', `http://localhost:${HTTP_PORT}`);
  const pathname = url.pathname;
  const sessionParam = url.searchParams.get('session');

  // === Root: Session Chooser ===
  if (pathname === '/') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    res.end(generateSessionChooser(limit));
    return;
  }

  // === Sessions List ===
  if (pathname === '/sessions') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(generateSessionList());
    return;
  }

  // === Test Sessions ===
  if (pathname === '/tests') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(generateTestSessionsList());
    return;
  }

  // === LLM Dashboard Endpoints (text/plain) ===
  if (pathname === '/dashboard') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const metrics = getMetricsForRequest(url);

    // Add session context to dashboard output
    let sessionHeader = '';
    if (sessionParam) {
      if (sessionParam === 'latest') {
        const sessions = getAllSessions();
        sessionHeader = sessions.length > 0 ? `\nViewing: Latest Session (${sessions[0].id})\n` : '';
      } else {
        sessionHeader = `\nViewing: Session ${sessionParam}\n`;
      }
    } else {
      sessionHeader = '\nViewing: All Sessions Combined\n';
    }

    // Resolve the actual session ID for 'latest'
    let resolvedSessionId = sessionParam;
    if (sessionParam === 'latest') {
      const sessions = getAllSessions();
      resolvedSessionId = sessions.length > 0 ? sessions[0].id : undefined;
    }

    const dashboard = generateDashboard(metrics, resolvedSessionId);
    // Insert session header after the title
    const output = dashboard.replace(
      '================================================================================\n',
      '================================================================================\n' + sessionHeader
    );
    res.end(output);
    return;
  }

  if (pathname === '/dashboard/timeline') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const metrics = getMetricsForRequest(url);
    res.end(generateTimeline(metrics));
    return;
  }

  if (pathname === '/dashboard/agents') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const metrics = getMetricsForRequest(url);
    res.end(generateAgentReport(metrics));
    return;
  }

  // === Agent Detail Endpoint (for more-agent-info) ===
  if (pathname === '/dashboard/agent') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const metrics = getMetricsForRequest(url);
    const agentId = url.searchParams.get('id');

    if (!agentId) {
      // List available agents
      const agentIds = Array.from(new Set(metrics.filter(m => m.agentId).map(m => m.agentId)));
      let output = `AI VILLAGE - AGENT DETAIL
===========================
No agent ID specified.

Available agents:
`;
      for (const id of agentIds) {
        output += `  - ${id}\n`;
        output += `    curl http://localhost:${HTTP_PORT}/dashboard/agent?id=${id}\n`;
      }
      output += `\nUsage: curl http://localhost:${HTTP_PORT}/dashboard/agent?id=<agentId>&session=<sessionId>\n`;
      res.end(output);
      return;
    }

    res.end(generateAgentDetail(metrics, agentId));
    return;
  }

  if (pathname === '/dashboard/resources') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const metrics = getMetricsForRequest(url);
    res.end(generateResourceReport(metrics));
    return;
  }

  // === Category-based Dashboard Routes ===
  // Hierarchical routes that group related views by category

  const categoryRoutes: Record<string, { title: string; viewIds: string[] }> = {
    '/dashboard/magic': {
      title: 'MAGIC SYSTEMS',
      viewIds: ['magic-systems', 'spellbook'],
    },
    '/dashboard/divinity': {
      title: 'DIVINITY & DIVINE POWERS',
      viewIds: ['divine-powers', 'vision-composer'],
    },
    '/dashboard/economy': {
      title: 'ECONOMY & TRADE',
      viewIds: ['resources', 'economy', 'shop', 'crafting'],
    },
    '/dashboard/social': {
      title: 'SOCIAL & GOVERNANCE',
      viewIds: ['population', 'relationships', 'memory', 'governance'],
    },
    '/dashboard/info': {
      title: 'ENTITY INFORMATION',
      viewIds: ['agent-info', 'animal-info', 'plant-info', 'tile-inspector'],
    },
    '/dashboard/environment': {
      title: 'ENVIRONMENT',
      viewIds: ['weather'],
    },
    '/dashboard/settings': {
      title: 'SETTINGS & CONTROLS',
      viewIds: ['settings', 'controls'],
    },
    '/dashboard/dev': {
      title: 'DEVELOPER TOOLS',
      viewIds: ['dev'],
    },
  };

  const categoryRoute = categoryRoutes[pathname];
  if (categoryRoute) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    const sessionParam = url.searchParams.get('session');
    let sessionId = sessionParam;
    if (sessionParam === 'latest') {
      const sessions = getAllSessions();
      sessionId = sessions.length > 0 ? sessions[0].id : undefined;
    }

    const context = buildViewContext(sessionId);
    const lines: string[] = [
      categoryRoute.title,
      '═'.repeat(60),
      '',
    ];

    // Render each view in the category
    for (const viewId of categoryRoute.viewIds) {
      const view = viewRegistry.get(viewId);
      if (view && hasTextFormatter(view)) {
        try {
          const data = view.getData(context);
          const formatted = view.textFormatter(data);
          lines.push(formatted);
          lines.push('');
          lines.push('─'.repeat(60));
          lines.push('');
        } catch (err) {
          lines.push(`[Error loading ${viewId}: ${err instanceof Error ? err.message : String(err)}]`);
          lines.push('');
        }
      }
    }

    // Navigation footer
    lines.push('');
    lines.push('NAVIGATION');
    lines.push('─'.repeat(40));
    lines.push('Categories:');
    lines.push(`  curl http://localhost:${HTTP_PORT}/dashboard/magic     - Magic systems`);
    lines.push(`  curl http://localhost:${HTTP_PORT}/dashboard/divinity  - Divine powers`);
    lines.push(`  curl http://localhost:${HTTP_PORT}/dashboard/economy   - Economy & trade`);
    lines.push(`  curl http://localhost:${HTTP_PORT}/dashboard/social    - Social & governance`);
    lines.push(`  curl http://localhost:${HTTP_PORT}/dashboard/info      - Entity info`);
    lines.push(`  curl http://localhost:${HTTP_PORT}/dashboard/dev       - Dev tools`);
    lines.push('');
    lines.push('Individual views:');
    for (const viewId of categoryRoute.viewIds) {
      lines.push(`  curl http://localhost:${HTTP_PORT}/view/${viewId}`);
    }

    res.end(lines.join('\n'));
    return;
  }

  // === Dashboard View Endpoints ===
  // Unified view system for both LLM and Player UI

  if (pathname === '/views') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    const allViews = viewRegistry.getAll();
    const lines: string[] = [
      'AVAILABLE VIEWS',
      '═'.repeat(60),
      '',
    ];

    for (const view of allViews) {
      const hasText = hasTextFormatter(view);
      const availability = hasText ? '✓ text' : '  canvas-only';
      lines.push(`  ${view.id.padEnd(20)} - ${view.title.padEnd(30)} (${view.category})`);
      lines.push(`  ${' '.repeat(20)}   ${availability}`);
      if (view.description) {
        lines.push(`  ${' '.repeat(20)}   ${view.description}`);
      }
      lines.push('');
    }

    lines.push('');
    lines.push('Usage:');
    lines.push(`  curl http://localhost:${HTTP_PORT}/view/<id>           - Get formatted text`);
    lines.push(`  curl http://localhost:${HTTP_PORT}/view/<id>?format=json - Get raw JSON data`);
    lines.push('');
    lines.push('Example:');
    lines.push(`  curl http://localhost:${HTTP_PORT}/view/resources`);
    lines.push(`  curl http://localhost:${HTTP_PORT}/view/population?format=json`);

    res.end(lines.join('\n'));
    return;
  }

  if (pathname.startsWith('/view/')) {
    const viewId = pathname.slice('/view/'.length);
    const format = url.searchParams.get('format') || 'text';
    const sessionParam = url.searchParams.get('session');

    // Resolve session ID
    let sessionId = sessionParam;
    if (sessionParam === 'latest') {
      const sessions = getAllSessions();
      sessionId = sessions.length > 0 ? sessions[0].id : undefined;
    }

    // Get view from registry
    const view = viewRegistry.get(viewId);
    if (!view) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      const availableViews = viewRegistry.getAll().map(v => v.id).join(', ');
      res.end(`View not found: ${viewId}\n\nAvailable views: ${availableViews}\n\nUse: curl http://localhost:${HTTP_PORT}/views\n`);
      return;
    }

    try {
      // Build context
      const context = buildViewContext(sessionId);

      // Get data from view
      const data = await Promise.resolve(view.getData(context));

      // Format response based on requested format
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data, null, 2));
      } else {
        // Text format
        if (!hasTextFormatter(view)) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(`View '${viewId}' does not support text formatting.\n\nTry: curl http://localhost:${HTTP_PORT}/view/${viewId}?format=json\n`);
          return;
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        const formattedText = view.textFormatter(data);
        res.end(formattedText);
      }
    } catch (error) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(`Error rendering view: ${error instanceof Error ? error.message : String(error)}\n`);
    }
    return;
  }

  // === Live Entity API Endpoints ===
  // These query the running game in real-time via WebSocket

  if (pathname === '/api/live/entities') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const gameClient = getActiveGameClient();
    if (!gameClient) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'No game client connected', connected: false }));
      return;
    }

    try {
      const result = await sendQueryToGame(gameClient, 'entities');
      res.end(JSON.stringify(result, null, 2));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Query failed' }));
    }
    return;
  }

  if (pathname === '/api/live/entity') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const entityId = url.searchParams.get('id');
    if (!entityId) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing required parameter: id' }));
      return;
    }

    const gameClient = getActiveGameClient();
    if (!gameClient) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'No game client connected', connected: false }));
      return;
    }

    try {
      const result = await sendQueryToGame(gameClient, 'entity', entityId);
      res.end(JSON.stringify(result, null, 2));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Query failed' }));
    }
    return;
  }

  if (pathname === '/api/live/prompt') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const entityId = url.searchParams.get('id');
    if (!entityId) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing required parameter: id' }));
      return;
    }

    const gameClient = getActiveGameClient();
    if (!gameClient) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'No game client connected', connected: false }));
      return;
    }

    try {
      const result = await sendQueryToGame(gameClient, 'entity_prompt', entityId);
      res.end(JSON.stringify(result, null, 2));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Query failed' }));
    }
    return;
  }

  if (pathname === '/api/live/status') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const gameClient = getActiveGameClient();
    res.end(JSON.stringify({
      connected: !!gameClient,
      activeClients: wsSessions.size,
    }));
    return;
  }

  if (pathname === '/api/live/universe') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const gameClient = getActiveGameClient();
    if (!gameClient) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'No game client connected', connected: false }));
      return;
    }

    try {
      const result = await sendQueryToGame(gameClient, 'universe');
      res.end(JSON.stringify(result, null, 2));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Query failed' }));
    }
    return;
  }

  if (pathname === '/api/live/magic') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const gameClient = getActiveGameClient();
    if (!gameClient) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'No game client connected', connected: false }));
      return;
    }

    try {
      const result = await sendQueryToGame(gameClient, 'magic');
      res.end(JSON.stringify(result, null, 2));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Query failed' }));
    }
    return;
  }

  if (pathname === '/api/live/divinity') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const gameClient = getActiveGameClient();
    if (!gameClient) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'No game client connected', connected: false }));
      return;
    }

    try {
      const result = await sendQueryToGame(gameClient, 'divinity');
      res.end(JSON.stringify(result, null, 2));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Query failed' }));
    }
    return;
  }

  // === Pending Approvals API ===

  if (pathname === '/api/live/pending-approvals') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const gameClient = getActiveGameClient();
    if (!gameClient) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'No game client connected', connected: false }));
      return;
    }

    try {
      const result = await sendQueryToGame(gameClient, 'pending_approvals');
      res.end(JSON.stringify(result, null, 2));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Query failed' }));
    }
    return;
  }

  if (pathname === '/api/live/approve-creation' && req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const gameClient = getActiveGameClient();
    if (!gameClient) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'No game client connected', connected: false }));
      return;
    }

    const creationId = url.searchParams.get('id');
    if (!creationId) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing id parameter' }));
      return;
    }

    try {
      const result = await sendActionToGame(gameClient, 'approve-creation', { creationId });
      res.end(JSON.stringify(result, null, 2));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Action failed' }));
    }
    return;
  }

  if (pathname === '/api/live/reject-creation' && req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const gameClient = getActiveGameClient();
    if (!gameClient) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'No game client connected', connected: false }));
      return;
    }

    const creationId = url.searchParams.get('id');
    if (!creationId) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing id parameter' }));
      return;
    }

    try {
      const result = await sendActionToGame(gameClient, 'reject-creation', { creationId });
      res.end(JSON.stringify(result, null, 2));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Action failed' }));
    }
    return;
  }

  // ============================================================
  // Canon Events API - Multiverse Bridge Endpoints
  // ============================================================

  // List canon events for a session
  if (pathname === '/api/canon/events') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const sessionId = url.searchParams.get('session') || 'latest';
    const typeFilter = url.searchParams.get('type');

    let events = getCanonEventsForSession(sessionId);

    // Filter by type if specified
    if (typeFilter) {
      events = events.filter(e => e.type === typeFilter);
    }

    // Return metadata only (no full snapshots)
    const metadata = events.map(e => ({
      id: e.id,
      type: e.type,
      timestamp: e.timestamp,
      tick: e.tick,
      day: e.day,
      description: e.description,
      agentIds: e.agentIds,
      agentNames: e.agentNames,
      genealogy: e.genealogy,
    }));

    res.end(JSON.stringify(metadata, null, 2));
    return;
  }

  // Get specific canon event with full snapshot
  if (pathname.startsWith('/api/canon/event/')) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const eventId = pathname.replace('/api/canon/event/', '');
    const sessionId = url.searchParams.get('session') || 'latest';

    try {
      const event = await loadCanonEventFromDisk(sessionId, eventId);
      if (!event) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Canon event not found' }));
        return;
      }

      res.end(JSON.stringify(event, null, 2));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to load event' }));
    }
    return;
  }

  // Export canon event package
  if (pathname.startsWith('/api/canon/export/')) {
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const eventId = pathname.replace('/api/canon/export/', '');
    const sessionId = url.searchParams.get('session') || 'latest';

    try {
      const packageData = await exportCanonEventPackage(sessionId, eventId);
      if (!packageData) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Canon event not found' }));
        return;
      }

      res.setHeader('Content-Disposition', `attachment; filename="canon_${eventId}.gz"`);
      res.end(packageData);
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to export' }));
    }
    return;
  }

  // Import canon event package (multipart upload)
  if (pathname === '/api/canon/import' && req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // TODO: Implement multipart file upload handler
    // For now, return placeholder
    res.statusCode = 501;
    res.end(JSON.stringify({
      error: 'Import endpoint not yet implemented',
      note: 'Use file upload with multipart/form-data'
    }));
    return;
  }

  // ============================================================
  // Canon Timeline Dashboard
  // ============================================================

  if (pathname === '/dashboard/canon') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const sessionId = url.searchParams.get('session') || 'latest';
    const events = getCanonEventsForSession(sessionId);

    let output = `CANON EVENTS TIMELINE - ${sessionId}\n`;
    output += `═══════════════════════════════════════════════════\n\n`;

    if (events.length === 0) {
      output += 'No canon events recorded yet.\n\n';
      output += 'Canon events are automatically recorded for:\n';
      output += '  - Soul creation ceremonies (ensoulment)\n';
      output += '  - Births of ensouled beings\n';
      output += '  - Deaths of ensouled beings\n';
      output += '  - Unions/marriages (when both ensouled)\n';
      output += '  - Reincarnations\n';
      output += '  - Time milestones (1 month, 3 months, 6 months, 1 year, 2 years)\n';
      output += '  - Sacred site creation\n';
      output += '  - Major crises (rebellions)\n';
    } else {
      for (const event of events) {
        const date = new Date(event.timestamp).toISOString();
        output += `[Day ${event.day}, Tick ${event.tick}] ${event.type.toUpperCase().replace(':', ':')}\n`;
        output += `  ${event.description}\n`;

        if (event.agentNames.length > 0) {
          output += `  Agents: ${event.agentNames.join(', ')}\n`;
        }

        if (event.genealogy) {
          if (event.type === 'time:milestone') {
            output += `  Population: ${event.genealogy.livingEnsouled} ensouled beings\n`;
            output += `  Unions: ${event.genealogy.totalUnions}, Deaths: ${event.genealogy.totalDeaths}\n`;
          }
        }

        output += `  Timestamp: ${date}\n`;
        output += `  Export: curl "http://localhost:${HTTP_PORT}/api/canon/export/${event.id}?session=${sessionId}" --output ${event.id}.gz\n`;
        output += '\n';
      }

      // Genealogy summary
      if (events.length > 0) {
        const latest = events[events.length - 1]!;
        if (latest.genealogy) {
          output += '\nGENEALOGY SUMMARY\n';
          output += '─────────────────\n';
          output += `Total souls created: ${latest.genealogy.totalSoulsCreated}\n`;
          output += `Living ensouled: ${latest.genealogy.livingEnsouled}\n`;
          output += `Total births: ${latest.genealogy.totalBirths}\n`;
          output += `Total deaths: ${latest.genealogy.totalDeaths}\n`;
          output += `Total unions: ${latest.genealogy.totalUnions}\n`;
          output += `Active lineages: ${latest.genealogy.lineages.length}\n`;

          if (latest.genealogy.reincarnationChains.length > 0) {
            output += '\nREINCARNATION CHAINS\n';
            output += '────────────────────\n';
            for (const chain of latest.genealogy.reincarnationChains) {
              const names = chain.incarnations.map(i => i.name).join(' → ');
              output += `${names} (${chain.incarnations.length} lives)\n`;
            }
          }
        }
      }

      output += '\nMULTIVERSE BRIDGE POINTS\n';
      output += '─────────────────────────\n';
      output += `Total bridge points: ${events.length}\n`;
      output += '\nEach canon event can be exported and imported into another\n';
      output += 'player\'s universe to create a multiverse bridge.\n';
    }

    res.end(output);
    return;
  }

  // === Dev Actions API (LLM-accessible dev tools) ===
  if (pathname === '/api/actions' && req.method === 'GET') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const actionsHelp = `================================================================================
LLM DEV TOOLS - Available Actions
================================================================================
This API allows you (the LLM) to perform dev actions on the running game.
All actions are POST requests with JSON bodies.

Game Status: ${getActiveGameClient() ? '🟢 CONNECTED' : '🔴 NOT CONNECTED'}

================================================================================
AGENT ACTIONS
================================================================================

1. SPAWN AGENT
   curl -X POST http://localhost:${HTTP_PORT}/api/actions/spawn-agent \\
     -H "Content-Type: application/json" \\
     -d '{"name": "Bob", "x": 10, "y": 10, "useLLM": true}'

   Parameters:
     - name (string, required): Agent name
     - x, y (number, required): Spawn position
     - useLLM (boolean, optional): Use LLM for decisions (default: true)

2. TELEPORT AGENT
   curl -X POST http://localhost:${HTTP_PORT}/api/actions/teleport \\
     -H "Content-Type: application/json" \\
     -d '{"agentId": "agent_123", "x": 50, "y": 50}'

   Parameters:
     - agentId (string, required): Agent to teleport
     - x, y (number, required): Destination

3. SET AGENT NEED
   curl -X POST http://localhost:${HTTP_PORT}/api/actions/set-need \\
     -H "Content-Type: application/json" \\
     -d '{"agentId": "agent_123", "need": "hunger", "value": 0.5}'

   Parameters:
     - agentId (string, required): Target agent
     - need (string, required): hunger, energy, warmth, social, safety
     - value (number, required): 0.0 to 1.0 (0 = critical, 1 = satisfied)

4. GIVE ITEM TO AGENT
   curl -X POST http://localhost:${HTTP_PORT}/api/actions/give-item \\
     -H "Content-Type: application/json" \\
     -d '{"agentId": "agent_123", "itemType": "wood", "amount": 10}'

   Parameters:
     - agentId (string, required): Target agent
     - itemType (string, required): Item type ID
     - amount (number, optional): Quantity (default: 1)

5. TRIGGER BEHAVIOR
   curl -X POST http://localhost:${HTTP_PORT}/api/actions/trigger-behavior \\
     -H "Content-Type: application/json" \\
     -d '{"agentId": "agent_123", "behavior": "gather", "target": "tree_456"}'

   Parameters:
     - agentId (string, required): Target agent
     - behavior (string, required): Behavior to trigger
     - target (string, optional): Target entity ID

================================================================================
WORLD ACTIONS
================================================================================

6. SET GAME SPEED
   curl -X POST http://localhost:${HTTP_PORT}/api/actions/set-speed \\
     -H "Content-Type: application/json" \\
     -d '{"speed": 2.0}'

   Parameters:
     - speed (number, required): 0.1 to 10.0 (1.0 = normal)

7. PAUSE/RESUME GAME
   curl -X POST http://localhost:${HTTP_PORT}/api/actions/pause \\
     -H "Content-Type: application/json" \\
     -d '{"paused": true}'

   Parameters:
     - paused (boolean, required): true = pause, false = resume

8. SPAWN ENTITY
   curl -X POST http://localhost:${HTTP_PORT}/api/actions/spawn-entity \\
     -H "Content-Type: application/json" \\
     -d '{"type": "tree", "x": 20, "y": 20}'

   Parameters:
     - type (string, required): Entity type (tree, animal, building, etc.)
     - x, y (number, required): Spawn position
     - data (object, optional): Additional entity data

================================================================================
MAGIC/DIVINITY ACTIONS
================================================================================

9. GRANT SPELL
   curl -X POST http://localhost:${HTTP_PORT}/api/actions/grant-spell \\
     -H "Content-Type: application/json" \\
     -d '{"agentId": "agent_123", "spellId": "fireball"}'

   Parameters:
     - agentId (string, required): Target agent
     - spellId (string, required): Spell to grant

10. ADD BELIEF
    curl -X POST http://localhost:${HTTP_PORT}/api/actions/add-belief \\
      -H "Content-Type: application/json" \\
      -d '{"deityId": "deity_123", "amount": 100}'

    Parameters:
      - deityId (string, required): Target deity
      - amount (number, required): Belief points to add

11. CREATE DEITY
    curl -X POST http://localhost:${HTTP_PORT}/api/actions/create-deity \\
      -H "Content-Type: application/json" \\
      -d '{"name": "Gaia", "domain": "nature", "controller": "player"}'

    Parameters:
      - name (string, required): Deity name
      - domain (string, optional): Divine domain
      - controller (string, optional): player, ai, dormant (default: dormant)

================================================================================
QUERY ACTIONS (for getting IDs and state)
================================================================================

  Get entities:  curl http://localhost:${HTTP_PORT}/api/live/entities
  Get entity:    curl "http://localhost:${HTTP_PORT}/api/live/entity?id=<entityId>"
  Get magic:     curl http://localhost:${HTTP_PORT}/api/live/magic
  Get divinity:  curl http://localhost:${HTTP_PORT}/api/live/divinity

================================================================================
NOTES
================================================================================
- All actions require a connected game (start the game first)
- Actions are sent to the game via WebSocket and executed in real-time
- Errors will return 400/500 status codes with error messages
- Actions modify the live game state - use carefully!

================================================================================
`;

    res.end(actionsHelp);
    return;
  }

  // Handle CORS preflight for POST requests
  if (req.method === 'OPTIONS' && pathname.startsWith('/api/actions/')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.statusCode = 204;
    res.end();
    return;
  }

  // Action handlers - all require POST
  if (pathname.startsWith('/api/actions/') && req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const gameClient = getActiveGameClient();
    if (!gameClient) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'No game client connected', connected: false }));
      return;
    }

    // Parse request body
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const params = JSON.parse(body);
        const action = pathname.replace('/api/actions/', '');

        // Route to specific action handler
        let result;
        switch (action) {
          case 'spawn-agent':
            result = await handleSpawnAgent(gameClient, params);
            break;
          case 'teleport':
            result = await handleTeleport(gameClient, params);
            break;
          case 'set-need':
            result = await handleSetNeed(gameClient, params);
            break;
          case 'give-item':
            result = await handleGiveItem(gameClient, params);
            break;
          case 'trigger-behavior':
            result = await handleTriggerBehavior(gameClient, params);
            break;
          case 'set-speed':
            result = await handleSetSpeed(gameClient, params);
            break;
          case 'pause':
            result = await handlePause(gameClient, params);
            break;
          case 'spawn-entity':
            result = await handleSpawnEntity(gameClient, params);
            break;
          case 'grant-spell':
            result = await handleGrantSpell(gameClient, params);
            break;
          case 'add-belief':
            result = await handleAddBelief(gameClient, params);
            break;
          case 'create-deity':
            result = await handleCreateDeity(gameClient, params);
            break;
          case 'set-llm-config':
            result = await handleSetLLMConfig(gameClient, params);
            break;
          default:
            res.statusCode = 404;
            res.end(JSON.stringify({ error: `Unknown action: ${action}` }));
            return;
        }

        res.end(JSON.stringify(result, null, 2));
      } catch (err) {
        res.statusCode = 400;
        res.end(JSON.stringify({
          error: err instanceof Error ? err.message : 'Invalid request',
          details: err instanceof Error ? err.stack : undefined
        }));
      }
    });
    return;
  }

  // === Headless Game Control API ===
  if (pathname === '/api/headless/list') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify({
      games: listHeadlessGames(),
      total: headlessGames.size,
    }, null, 2));
    return;
  }

  if (pathname === '/api/headless/spawn' && req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const params = body ? JSON.parse(body) : {};
        const sessionId = params.sessionId || `headless_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const agentCount = params.agentCount || 5;

        // Check if already running
        if (headlessGames.has(sessionId)) {
          res.statusCode = 409;
          res.end(JSON.stringify({ error: `Game with session ${sessionId} already running` }));
          return;
        }

        const game = spawnHeadlessGame(sessionId, agentCount);
        res.end(JSON.stringify({
          success: true,
          sessionId,
          agentCount,
          status: game.status,
          dashboardUrl: `http://localhost:${HTTP_PORT}/dashboard?session=${sessionId}`,
        }, null, 2));
      } catch (err) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Invalid request' }));
      }
    });
    return;
  }

  if (pathname === '/api/headless/stop' && req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const params = body ? JSON.parse(body) : {};
        const sessionId = params.sessionId;

        if (!sessionId) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'sessionId is required' }));
          return;
        }

        const stopped = stopHeadlessGame(sessionId);
        if (stopped) {
          res.end(JSON.stringify({ success: true, sessionId, message: 'Game stopped' }));
        } else {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: `No game found with session ${sessionId}` }));
        }
      } catch (err) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Invalid request' }));
      }
    });
    return;
  }

  if (pathname === '/api/headless/stop-all' && req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const stopped: string[] = [];
    for (const sessionId of headlessGames.keys()) {
      if (stopHeadlessGame(sessionId)) {
        stopped.push(sessionId);
      }
    }

    res.end(JSON.stringify({ success: true, stopped, count: stopped.length }));
    return;
  }

  if (pathname === '/api/headless' || pathname === '/api/headless/') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const helpText = `================================================================================
HEADLESS GAME CONTROL API
================================================================================
Run game simulations without a browser window.

ENDPOINTS:
--------------------------------------------------------------------------------

1. LIST RUNNING GAMES
   curl http://localhost:${HTTP_PORT}/api/headless/list

   Returns: Array of running headless games with status

2. SPAWN NEW GAME
   curl -X POST http://localhost:${HTTP_PORT}/api/headless/spawn \\
     -H "Content-Type: application/json" \\
     -d '{"sessionId": "my_game_123", "agentCount": 5}'

   Parameters:
     - sessionId (string, optional): Custom session ID (auto-generated if not provided)
     - agentCount (number, optional): Number of agents to spawn (default: 5)

   Returns: Session info and dashboard URL

3. STOP GAME
   curl -X POST http://localhost:${HTTP_PORT}/api/headless/stop \\
     -H "Content-Type: application/json" \\
     -d '{"sessionId": "my_game_123"}'

   Parameters:
     - sessionId (string, required): Session ID of game to stop

4. STOP ALL GAMES
   curl -X POST http://localhost:${HTTP_PORT}/api/headless/stop-all

   Stops all running headless games

================================================================================
RUNNING GAMES: ${headlessGames.size}
================================================================================
${listHeadlessGames().map(g => `  ${g.sessionId}: ${g.status} (${g.agentCount} agents, ${Math.round(g.uptime / 1000)}s uptime)`).join('\n') || '  (none)'}
`;
    res.end(helpText);
    return;
  }

  // === Save/Load/Fork API (Time Manipulation Dev Tools) ===

  // List all saves for a session
  if (pathname === '/api/saves' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const sessionId = url.searchParams.get('session');
    if (!sessionId) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'session parameter is required' }));
      return;
    }

    try {
      const saves = await saveStateManager.listSaves(sessionId);
      res.end(JSON.stringify({ success: true, sessionId, saves }, null, 2));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to list saves' }));
    }
    return;
  }

  // Save current game state
  if (pathname === '/api/save' && req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const params = body ? JSON.parse(body) : {};
        const sessionId = params.sessionId;
        const saveName = params.saveName;
        const description = params.description;

        if (!sessionId) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'sessionId is required' }));
          return;
        }

        // Get the world from the active WebSocket connection
        // For now, this endpoint requires integration with the running game
        // The game needs to send its World instance via WebSocket when requested

        res.statusCode = 501;
        res.end(JSON.stringify({
          error: 'Save endpoint not yet integrated with running game',
          note: 'This endpoint requires the game to send its World instance via WebSocket. Use SaveStateManager directly in headless scripts for now.'
        }));
      } catch (err) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Invalid request' }));
      }
    });
    return;
  }

  // Load a save (rewind)
  if (pathname === '/api/load' && req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const params = body ? JSON.parse(body) : {};
        const sessionId = params.sessionId;
        const saveName = params.saveName;

        if (!sessionId || !saveName) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'sessionId and saveName are required' }));
          return;
        }

        const saveState = await saveStateManager.loadState(sessionId, saveName);
        res.end(JSON.stringify({
          success: true,
          sessionId,
          saveName,
          metadata: saveState.metadata,
          note: 'Snapshot loaded. Use WorldSerializer.deserializeWorld() to restore the world in your game.'
        }, null, 2));
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to load save' }));
      }
    });
    return;
  }

  // Fork a new universe from a save
  if (pathname === '/api/fork' && req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const params = body ? JSON.parse(body) : {};
        const sourceSession = params.sourceSession;
        const saveName = params.saveName;
        const newSession = params.newSession;
        const description = params.description;

        if (!sourceSession || !saveName || !newSession) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'sourceSession, saveName, and newSession are required' }));
          return;
        }

        const forkedMetadata = await saveStateManager.forkState(
          sourceSession,
          saveName,
          newSession,
          description
        );

        res.end(JSON.stringify({
          success: true,
          sourceSession,
          saveName,
          newSession,
          metadata: forkedMetadata,
          dashboardUrl: `http://localhost:${HTTP_PORT}/dashboard?session=${newSession}`
        }, null, 2));
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to fork save' }));
      }
    });
    return;
  }

  // Delete a save
  if (pathname === '/api/save' && req.method === 'DELETE') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const sessionId = url.searchParams.get('session');
    const saveName = url.searchParams.get('save');

    if (!sessionId || !saveName) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'session and save parameters are required' }));
      return;
    }

    try {
      await saveStateManager.deleteSave(sessionId, saveName);
      res.end(JSON.stringify({ success: true, sessionId, saveName }));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to delete save' }));
    }
    return;
  }

  // Save/Load API help endpoint
  if (pathname === '/api/save-load' || pathname === '/api/save-load/') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const helpText = `================================================================================
SAVE/LOAD/FORK API - Time Manipulation Dev Tools
================================================================================
Manual save, rewind, fork, and load capabilities for headless games.

ENDPOINTS:
--------------------------------------------------------------------------------

1. LIST SAVES FOR SESSION
   curl "http://localhost:${HTTP_PORT}/api/saves?session=my_game"

   Parameters:
     - session (string, required): Session ID

   Returns: Array of save metadata with timestamps, days, agent counts

2. LOAD A SAVE (REWIND)
   curl -X POST http://localhost:${HTTP_PORT}/api/load \\
     -H "Content-Type: application/json" \\
     -d '{"sessionId": "my_game", "saveName": "save_001"}'

   Parameters:
     - sessionId (string, required): Session ID
     - saveName (string, required): Save name to load

   Returns: Save metadata and snapshot

3. FORK A NEW UNIVERSE
   curl -X POST http://localhost:${HTTP_PORT}/api/fork \\
     -H "Content-Type: application/json" \\
     -d '{"sourceSession": "my_game", "saveName": "save_001", "newSession": "experiment_1", "description": "Testing alternate timeline"}'

   Parameters:
     - sourceSession (string, required): Source session ID
     - saveName (string, required): Save to fork from
     - newSession (string, required): New session ID
     - description (string, optional): Description of the fork

   Returns: Forked save metadata and dashboard URL

4. DELETE A SAVE
   curl -X DELETE "http://localhost:${HTTP_PORT}/api/save?session=my_game&save=save_001"

   Parameters:
     - session (string, required): Session ID
     - save (string, required): Save name to delete

   Returns: Success confirmation

NOTE: The POST /api/save endpoint for creating saves is not yet integrated with
      running games. Use SaveStateManager directly in headless scripts for now:

      import { SaveStateManager } from '@ai-village/core';
      const saveManager = new SaveStateManager('saves');
      await saveManager.saveState(world, sessionId, { description: 'Checkpoint' });

================================================================================
See TIME_MANIPULATION_DEVTOOLS.md for more details
================================================================================
`;
    res.end(helpText);
    return;
  }

  // === JSON Endpoints ===
  res.setHeader('Content-Type', 'application/json');

  if (pathname === '/sessions.json') {
    res.end(JSON.stringify(getAllSessions(), null, 2));
    return;
  }

  if (pathname === '/metrics') {
    const metrics = getMetricsForRequest(url);
    res.end(JSON.stringify(metrics, null, 2));
  } else if (pathname === '/metrics/building') {
    const metrics = getMetricsForRequest(url);
    const buildingMetrics = metrics.filter(m =>
      m.type.includes('construction') ||
      m.type.includes('building') ||
      m.type.includes('task:started')
    );
    res.end(JSON.stringify(buildingMetrics, null, 2));
  } else if (pathname === '/metrics/summary') {
    const metrics = getMetricsForRequest(url);
    const summary = {
      total: metrics.length,
      byType: {} as Record<string, number>,
      buildingEvents: {
        constructionStarted: metrics.filter(m => m.type === 'task:started' && m.data?.taskType === 'construction').length,
        buildingComplete: metrics.filter(m => m.type === 'building:complete').length,
      },
      recentEvents: metrics.slice(-20).map(m => ({ type: m.type, timestamp: new Date(m.timestamp).toISOString() })),
    };
    for (const m of metrics) {
      summary.byType[m.type] = (summary.byType[m.type] || 0) + 1;
    }
    res.end(JSON.stringify(summary, null, 2));
  } else {
    res.end(JSON.stringify({
      endpoints: {
        session_browser: [
          '/ - Session chooser (start here)',
          '/sessions - List all sessions',
          '/sessions.json - Sessions as JSON',
        ],
        llm_dashboard: [
          '/dashboard - All sessions combined',
          '/dashboard?session=latest - Most recent session',
          '/dashboard?session=<id> - Specific session',
          '/dashboard/timeline?session=<id> - Event timeline',
          '/dashboard/agents?session=<id> - Agent activity',
          '/dashboard/agent?id=<agentId> - Detailed agent info (more-agent-info)',
          '/dashboard/resources?session=<id> - Resource flow',
        ],
        category_views: [
          '/dashboard/magic - Magic systems & spellbook',
          '/dashboard/divinity - Divine powers & vision composer',
          '/dashboard/economy - Resources, economy, shop, crafting',
          '/dashboard/social - Population, relationships, governance',
          '/dashboard/info - Agent, animal, plant, tile info',
          '/dashboard/environment - Weather & environment',
          '/dashboard/settings - Settings & controls',
          '/dashboard/dev - Developer tools',
        ],
        unified_views: [
          '/views - List all available dashboard views',
          '/view/<id> - Get view data as formatted text',
          '/view/<id>?format=json - Get view data as JSON',
          '/view/<id>?session=<id> - Get view for specific session',
        ],
        json_api: [
          '/metrics?session=<id> - Raw metrics',
          '/metrics/building?session=<id> - Building metrics',
          '/metrics/summary?session=<id> - Summary stats',
        ],
        live_api: [
          '/api/live/status - Check if game is connected',
          '/api/live/entities - List all agents (live)',
          '/api/live/entity?id=<entityId> - Get entity state (live)',
          '/api/live/prompt?id=<entityId> - Get LLM prompt (live)',
          '/api/live/universe - Get universe configuration (dimensions, laws, etc.)',
          '/api/live/magic - Get magic system info (enabled paradigms, etc.)',
          '/api/live/divinity - Get divinity info (gods, belief, pantheons, etc.)',
        ],
        actions_api: [
          '/api/actions - List all available dev actions (LLM dev tools)',
          'POST /api/actions/spawn-agent - Spawn a new agent',
          'POST /api/actions/teleport - Teleport an agent',
          'POST /api/actions/give-item - Give items to an agent',
          'POST /api/actions/set-need - Set agent needs (hunger, energy, etc.)',
          'POST /api/actions/trigger-behavior - Trigger a behavior',
          'POST /api/actions/set-speed - Change game speed',
          'POST /api/actions/pause - Pause/resume game',
          'POST /api/actions/spawn-entity - Spawn entities (trees, animals, etc.)',
          'POST /api/actions/grant-spell - Grant spells to agents',
          'POST /api/actions/add-belief - Add belief to deities',
          'POST /api/actions/create-deity - Create a new deity',
        ],
        headless_api: [
          '/api/headless - Headless game control help',
          '/api/headless/list - List running headless games',
          'POST /api/headless/spawn - Start a headless game',
          'POST /api/headless/stop - Stop a headless game by session ID',
          'POST /api/headless/stop-all - Stop all headless games',
        ],
      },
    }, null, 2));
  }
});

httpServer.listen(HTTP_PORT, () => {
  console.log(`HTTP server listening on http://localhost:${HTTP_PORT}`);
});

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws: WebSocket) => {
  const sessionId = `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  wsSessions.set(ws, sessionId);

  // Create new game session
  getOrCreateSession(sessionId);
  console.log(`[${new Date().toISOString()}] Client connected: ${sessionId}`);

  // Send session ID to client
  ws.send(JSON.stringify({ type: 'session', sessionId }));

  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      messageCount++;

      // Log progress periodically
      const now = Date.now();
      if (now - lastLogTime > 5000) {
        console.log(`[${new Date().toISOString()}] Received ${messageCount} messages total`);
        lastLogTime = now;
      }

      switch (message.type) {
        case 'client_info':
          // Client is telling us which game session it belongs to
          if (message.gameSessionId) {
            // Use the client's game session ID instead of the server-generated one
            const oldSessionId = wsSessions.get(ws) || sessionId;
            const newSessionId = message.gameSessionId;

            // Migrate any metrics from the temporary session to the real one
            const oldMetrics = sessionMetrics.get(oldSessionId) || [];
            if (oldMetrics.length > 0 && oldSessionId !== newSessionId) {
              // Move metrics to the real session
              for (const m of oldMetrics) {
                addMetricToSession(newSessionId, m);
              }
              // Clean up the temporary session
              gameSessions.delete(oldSessionId);
              sessionMetrics.delete(oldSessionId);
            } else {
              // Just create/get the session with the client's ID
              getOrCreateSession(newSessionId);
            }

            wsSessions.set(ws, newSessionId);
            console.log(`[${new Date().toISOString()}] Session remapped: ${oldSessionId} -> ${newSessionId}`);

            // Send the confirmed session ID back to client
            ws.send(JSON.stringify({ type: 'session', sessionId: newSessionId }));
          }

          // Handle test flag
          if (message.isTest) {
            const currentSessionId = wsSessions.get(ws) || sessionId;
            markSessionAsTest(currentSessionId);
            const session = gameSessions.get(currentSessionId.replace('game_', 'test_'));
            if (session) {
              wsSessions.set(ws, session.id);
            }
          }
          break;

        case 'metric':
          await handleMetric(wsSessions.get(ws) || sessionId, message.data);
          break;

        case 'batch':
          await handleBatch(wsSessions.get(ws) || sessionId, message.data);
          break;

        case 'canon_event':
          // Handle canon event from game client
          const currentSessionId = wsSessions.get(ws) || sessionId;
          const canonEvent: CanonEvent = message.event;
          await addCanonEvent(currentSessionId, canonEvent);
          console.log(`[${new Date().toISOString()}] Canon event recorded: ${canonEvent.type} (${canonEvent.id})`);
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;

        case 'query_response':
          // Handle response from game client for a pending query
          const queryId = message.requestId;
          const pending = pendingQueries.get(queryId);
          if (pending) {
            clearTimeout(pending.timeout);
            pendingQueries.delete(queryId);
            if (message.success) {
              pending.resolve(message.data);
            } else {
              pending.reject(new Error(message.error || 'Query failed'));
            }
          }
          break;

        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  ws.on('close', () => {
    console.log(`[${new Date().toISOString()}] Client disconnected: ${sessionId}`);
    wsSessions.delete(ws);

    // Mark session as ended and save
    const session = gameSessions.get(sessionId);
    if (session) {
      session.endTime = Date.now();
      saveSessionToDisk(sessionId);
    }
  });

  ws.on('error', (err) => {
    console.error(`[${sessionId}] WebSocket error:`, err);
  });
});

async function handleMetric(sessionId: string, metric: StoredMetric): Promise<void> {
  addMetricToSession(sessionId, metric);
}

async function handleBatch(sessionId: string, metrics: StoredMetric[]): Promise<void> {
  for (const metric of metrics) {
    addMetricToSession(sessionId, metric);
  }
  console.log(`[${new Date().toISOString()}] Stored batch of ${metrics.length} metrics to session ${sessionId}`);
}

// Auto-save sessions periodically (every 30 seconds)
setInterval(() => {
  if (gameSessions.size > 0) {
    saveAllSessionsToDisk();
  }
}, 30000);

// Cleanup old sessions and canon events periodically (once per day)
setInterval(() => {
  cleanupOldSessions();
  cleanupOldCanonEvents();
}, 24 * 60 * 60 * 1000); // 24 hours

// Run initial cleanup on startup
cleanupOldSessions();
cleanupOldCanonEvents();

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('\nShutting down...');

  // Close all connections
  wss.clients.forEach((client) => {
    client.close();
  });

  // Save all sessions to disk
  saveAllSessionsToDisk();
  console.log(`Saved ${gameSessions.size} sessions`);

  console.log('Metrics server stopped.');
  process.exit(0);
});

console.log(`Metrics server listening on ws://localhost:${PORT}`);
console.log('Press Ctrl+C to stop\n');
