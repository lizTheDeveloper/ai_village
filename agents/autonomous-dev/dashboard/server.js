/**
 * AI Village Orchestration Dashboard Server
 *
 * Provides API endpoints for:
 * - Parsing and displaying MASTER_ROADMAP.md
 * - Managing work orders
 * - Launching agent pipelines
 * - Real-time status updates via SSE
 */

const express = require('express');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3030;

// Paths
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const ROADMAP_PATH = path.join(PROJECT_ROOT, 'MASTER_ROADMAP.md');
const WORK_ORDERS_DIR = path.join(__dirname, '../work-orders');
const SCRIPTS_DIR = path.join(__dirname, '../scripts');
const LOGS_DIR = path.join(PROJECT_ROOT, 'logs');

// Active pipelines (in-memory state)
const activePipelines = new Map();

// SSE clients for real-time updates
const sseClients = new Set();

// Game server process
let gameServerProcess = null;
const GAME_SERVER_PORT = 3000;

// Parallel workers process
let parallelWorkersProcess = null;
const PARALLEL_WORKERS_STATE_FILE = path.join(__dirname, '.parallel-workers.json');

// Persistence file for pipeline state
const PIPELINES_STATE_FILE = path.join(__dirname, '.pipelines.json');
const GAME_SERVER_STATE_FILE = path.join(__dirname, '.game-server.json');

// Load persisted pipelines on startup
function loadPersistedPipelines() {
    if (!fs.existsSync(PIPELINES_STATE_FILE)) {
        return;
    }

    try {
        const data = JSON.parse(fs.readFileSync(PIPELINES_STATE_FILE, 'utf-8'));
        let reconnected = 0;
        let cleaned = 0;

        for (const pipeline of data) {
            // Check if process is still running
            try {
                process.kill(pipeline.pid, 0); // Signal 0 checks if process exists

                // Process exists, reconnect to it (but we can't get stdout/stderr)
                activePipelines.set(pipeline.id, {
                    ...pipeline,
                    process: null, // Can't reconnect to the process streams
                    logs: pipeline.logs || [],
                    reconnected: true
                });
                reconnected++;
                console.log(`  ↻ Reconnected to pipeline: ${pipeline.featureName} (PID: ${pipeline.pid})`);
            } catch (err) {
                // Process doesn't exist anymore
                cleaned++;
            }
        }

        if (reconnected > 0 || cleaned > 0) {
            console.log(`  📊 Loaded ${reconnected} active pipelines, cleaned ${cleaned} dead ones`);
        }
    } catch (err) {
        console.error('Failed to load persisted pipelines:', err.message);
    }
}

// Watch for external pipeline changes (pipelines launched directly via CLI)
let pipelinesFileWatcher = null;
let lastPipelinesFileSize = 0;
const externalPipelineLogPositions = new Map(); // Track read positions for log files

function watchPipelinesFile() {
    if (pipelinesFileWatcher) return; // Already watching

    // Poll the file every 2 seconds for changes
    pipelinesFileWatcher = setInterval(() => {
        if (!fs.existsSync(PIPELINES_STATE_FILE)) return;

        try {
            const stat = fs.statSync(PIPELINES_STATE_FILE);
            const fileChanged = stat.size !== lastPipelinesFileSize;

            if (fileChanged) {
                lastPipelinesFileSize = stat.size;
            }

            const data = JSON.parse(fs.readFileSync(PIPELINES_STATE_FILE, 'utf-8'));

            // Check for new pipelines we don't know about
            for (const pipeline of data) {
                if (activePipelines.has(pipeline.id)) continue; // Already tracking by ID

                // Also check if we're already tracking this PID (different ID but same process)
                let alreadyTracking = false;
                for (const [existingId, existing] of activePipelines) {
                    if (existing.pid === pipeline.pid) {
                        alreadyTracking = true;
                        break;
                    }
                }
                if (alreadyTracking) continue;

                // Check if process is still running
                try {
                    process.kill(pipeline.pid, 0);

                    // New external pipeline detected!
                    activePipelines.set(pipeline.id, {
                        ...pipeline,
                        process: null,
                        logs: pipeline.logs || [],
                        reconnected: true,
                        external: true
                    });

                    console.log(`  📥 Detected external pipeline: ${pipeline.featureName} (PID: ${pipeline.pid})`);
                    broadcast({ type: 'pipeline-started', id: pipeline.id, featureName: pipeline.featureName, external: true });
                } catch (err) {
                    // Process doesn't exist
                }
            }

            // Update status and read logs for external pipelines
            for (const [id, pipeline] of activePipelines) {
                if (!pipeline.external) continue;

                let processRunning = false;
                try {
                    process.kill(pipeline.pid, 0);
                    processRunning = true;
                } catch (err) {
                    // Process ended
                }

                // Find the most recent log file for this pipeline
                const logFiles = fs.readdirSync(LOGS_DIR)
                    .filter(f => f.includes(pipeline.featureName) && f.endsWith('.log'))
                    .sort()
                    .reverse();

                if (logFiles.length > 0) {
                    const logPath = path.join(LOGS_DIR, logFiles[0]);
                    const logKey = `${id}:${logFiles[0]}`;
                    const lastPos = externalPipelineLogPositions.get(logKey) || 0;

                    try {
                        const logStat = fs.statSync(logPath);
                        if (logStat.size > lastPos) {
                            // Read new content
                            const fd = fs.openSync(logPath, 'r');
                            const buffer = Buffer.alloc(logStat.size - lastPos);
                            fs.readSync(fd, buffer, 0, buffer.length, lastPos);
                            fs.closeSync(fd);

                            const newContent = buffer.toString('utf-8');
                            if (newContent.trim()) {
                                const logEntry = { type: 'stdout', text: newContent, time: new Date().toISOString() };
                                pipeline.logs.push(logEntry);
                                broadcast({ type: 'pipeline-log', id, log: newContent, stream: 'stdout' });
                            }

                            externalPipelineLogPositions.set(logKey, logStat.size);
                        }
                    } catch (err) {
                        // Ignore read errors
                    }
                }

                // Check if process ended
                if (!processRunning && pipeline.status === 'running') {
                    pipeline.status = 'complete';
                    pipeline.endTime = new Date().toISOString();
                    broadcast({ type: 'pipeline-complete', id, status: 'complete' });
                    console.log(`  ✅ External pipeline completed: ${pipeline.featureName}`);
                }
            }
        } catch (err) {
            // Ignore parse errors (file might be mid-write)
        }
    }, 2000);
}

// Persist pipelines to disk
function persistPipelines() {
    const data = Array.from(activePipelines.values()).map(p => ({
        id: p.id,
        featureName: p.featureName,
        pid: p.pid,
        startTime: p.startTime,
        status: p.status,
        endTime: p.endTime,
        exitCode: p.exitCode,
        logs: p.logs.slice(-100) // Keep last 100 log entries
    }));

    try {
        fs.writeFileSync(PIPELINES_STATE_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Failed to persist pipelines:', err.message);
    }
}

// Persist game server state
function persistGameServer() {
    if (!gameServerProcess) {
        // Remove state file if server is not running
        if (fs.existsSync(GAME_SERVER_STATE_FILE)) {
            fs.unlinkSync(GAME_SERVER_STATE_FILE);
        }
        return;
    }

    const data = {
        pid: gameServerProcess.pid,
        startTime: new Date().toISOString()
    };

    try {
        fs.writeFileSync(GAME_SERVER_STATE_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Failed to persist game server state:', err.message);
    }
}

// Load persisted game server on startup
function loadPersistedGameServer() {
    if (!fs.existsSync(GAME_SERVER_STATE_FILE)) {
        return;
    }

    try {
        const data = JSON.parse(fs.readFileSync(GAME_SERVER_STATE_FILE, 'utf-8'));

        // Check if process is still running
        try {
            process.kill(data.pid, 0); // Signal 0 checks if process exists

            // Process exists, mark it as reconnected (but we can't get the actual process handle)
            gameServerProcess = { pid: data.pid, reconnected: true };
            console.log(`  ↻ Reconnected to game server (PID: ${data.pid})`);
        } catch (err) {
            // Process doesn't exist anymore, clean up the state file
            fs.unlinkSync(GAME_SERVER_STATE_FILE);
            console.log(`  🧹 Cleaned up stale game server state`);
        }
    } catch (err) {
        console.error('Failed to load persisted game server:', err.message);
    }
}

app.use(express.json());
app.use(express.static(__dirname));

// =============================================================================
// Roadmap Parsing
// =============================================================================

function parseRoadmap() {
    const content = fs.readFileSync(ROADMAP_PATH, 'utf-8');
    const phases = [];
    const lines = content.split('\n');

    let currentPhase = null;
    let inTaskTable = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Match phase headers like "### Phase 0: Foundation ✅ COMPLETE"
        const phaseMatch = line.match(/^### Phase (\d+): ([^✅🚧⏳🔒🔀]+)(✅|🚧|⏳|🔒|🔀)?/);
        if (phaseMatch) {
            if (currentPhase) {
                phases.push(currentPhase);
            }

            const statusEmoji = phaseMatch[3] || '';
            let status = 'unknown';
            if (statusEmoji === '✅' || line.includes('COMPLETE')) status = 'complete';
            else if (statusEmoji === '🚧' || line.includes('IN PROGRESS')) status = 'in_progress';
            else if (statusEmoji === '⏳' || line.includes('READY')) status = 'ready';
            else if (statusEmoji === '🔒' || line.includes('BLOCKED')) status = 'blocked';

            currentPhase = {
                number: parseInt(phaseMatch[1]),
                name: phaseMatch[2].trim(),
                status,
                tasks: [],
                dependencies: [],
                parallelWith: []
            };
            inTaskTable = false;
            continue;
        }

        // Check for explicit **Status:** line (overrides header emoji)
        if (currentPhase && line.match(/^\*\*Status:\*\*/)) {
            if (line.includes('✅') || line.includes('Complete')) currentPhase.status = 'complete';
            else if (line.includes('🚧') || line.includes('In Progress')) currentPhase.status = 'in_progress';
            else if (line.includes('⏳') || line.includes('Ready')) currentPhase.status = 'ready';
            else if (line.includes('🔒') || line.includes('Blocked')) currentPhase.status = 'blocked';
        }

        // Extract dependencies
        if (currentPhase && line.includes('**Dependencies:**')) {
            const depsMatch = line.match(/Phase (\d+)/g);
            if (depsMatch) {
                currentPhase.dependencies = depsMatch.map(d => parseInt(d.replace('Phase ', '')));
            }
        }

        // Extract parallel info
        if (currentPhase && line.includes('🔀') && line.includes('parallel')) {
            const parallelMatch = line.match(/Phase (\d+)/g);
            if (parallelMatch) {
                currentPhase.parallelWith = parallelMatch.map(d => parseInt(d.replace('Phase ', '')));
            }
        }

        // Detect task table start
        if (currentPhase && line.includes('| Task | Status |')) {
            inTaskTable = true;
            continue;
        }

        // Parse task rows
        if (currentPhase && inTaskTable && line.startsWith('|') && !line.includes('---')) {
            const cells = line.split('|').map(c => c.trim()).filter(c => c);
            if (cells.length >= 2 && cells[0] !== 'Task') {
                let taskStatus = 'unknown';
                if (cells[1].includes('✅')) taskStatus = 'complete';
                else if (cells[1].includes('🚧')) taskStatus = 'in_progress';
                else if (cells[1].includes('⏳')) taskStatus = 'ready';
                else if (cells[1].includes('🔒')) taskStatus = 'blocked';

                const task = {
                    name: cells[0],
                    status: taskStatus,
                    spec: cells.length > 2 ? cells[2] : null,
                    parallel: cells.length > 3 && cells[3].includes('🔀')
                };
                currentPhase.tasks.push(task);
            }
        }

        // End task table
        if (currentPhase && inTaskTable && line.trim() === '') {
            inTaskTable = false;
        }
    }

    if (currentPhase) {
        phases.push(currentPhase);
    }

    return phases;
}

function getRoadmapRaw() {
    return fs.readFileSync(ROADMAP_PATH, 'utf-8');
}

// =============================================================================
// Work Orders
// =============================================================================

function getWorkOrders() {
    if (!fs.existsSync(WORK_ORDERS_DIR)) {
        return [];
    }

    const orders = [];
    const dirs = fs.readdirSync(WORK_ORDERS_DIR).filter(d => {
        if (d === 'archive') return false; // Exclude archive folder
        const stat = fs.statSync(path.join(WORK_ORDERS_DIR, d));
        return stat.isDirectory();
    });

    for (const dir of dirs) {
        const orderPath = path.join(WORK_ORDERS_DIR, dir);
        const statePath = path.join(orderPath, '.state');
        const workOrderPath = path.join(orderPath, 'work-order.md');
        const playtestPath = path.join(orderPath, 'playtest-report.md');
        const screenshotsDir = path.join(orderPath, 'screenshots');

        const order = {
            name: dir,
            state: fs.existsSync(statePath) ? fs.readFileSync(statePath, 'utf-8').trim() : 'NEW',
            hasWorkOrder: fs.existsSync(workOrderPath),
            hasPlaytestReport: fs.existsSync(playtestPath),
            screenshotCount: 0,
            verdict: null
        };

        if (fs.existsSync(screenshotsDir)) {
            order.screenshotCount = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png')).length;
        }

        if (order.hasPlaytestReport) {
            const report = fs.readFileSync(playtestPath, 'utf-8');
            if (report.includes('APPROVED')) order.verdict = 'APPROVED';
            else if (report.includes('NEEDS_WORK')) order.verdict = 'NEEDS_WORK';
        }

        orders.push(order);
    }

    return orders;
}

function getWorkOrderContent(name) {
    const workOrderPath = path.join(WORK_ORDERS_DIR, name, 'work-order.md');
    if (fs.existsSync(workOrderPath)) {
        return fs.readFileSync(workOrderPath, 'utf-8');
    }
    return null;
}

function getPlaytestReport(name) {
    const reportPath = path.join(WORK_ORDERS_DIR, name, 'playtest-report.md');
    if (fs.existsSync(reportPath)) {
        return fs.readFileSync(reportPath, 'utf-8');
    }
    return null;
}

function getScreenshots(name) {
    const screenshotsDir = path.join(WORK_ORDERS_DIR, name, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
        return [];
    }
    return fs.readdirSync(screenshotsDir)
        .filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
        .map(f => ({
            name: f,
            path: `/api/work-orders/${name}/screenshots/${f}`
        }));
}

// =============================================================================
// Pipeline Management
// =============================================================================

function launchPipeline(featureName, options = {}) {
    const scriptPath = path.join(SCRIPTS_DIR, 'orchestrator.sh');

    const args = [];
    if (options.resume && featureName) {
        // Resume mode: --resume NAME
        args.push('--resume', featureName);
    } else if (featureName) {
        // Feature mode: --feature NAME
        args.push('--feature', featureName);
    }
    // Auto mode: no arguments (picks next from roadmap)

    const proc = spawn('bash', [scriptPath, ...args], {
        cwd: PROJECT_ROOT,
        env: { ...process.env, MAX_IMPL_RETRIES: '3', MAX_PLAYTEST_RETRIES: '5' },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    // Use same ID format as orchestrator: pipeline-{featureName}-{pid}
    const id = `pipeline-${featureName || 'auto'}-${proc.pid}`;

    const pipeline = {
        id,
        featureName: featureName || 'auto',
        startTime: new Date().toISOString(),
        status: 'running',
        logs: [],
        process: proc,
        pid: proc.pid
    };

    proc.stdout.on('data', (data) => {
        const log = data.toString();
        pipeline.logs.push({ type: 'stdout', text: log, time: new Date().toISOString() });
        broadcast({ type: 'pipeline-log', id, log, stream: 'stdout' });
    });

    proc.stderr.on('data', (data) => {
        const log = data.toString();
        pipeline.logs.push({ type: 'stderr', text: log, time: new Date().toISOString() });
        broadcast({ type: 'pipeline-log', id, log, stream: 'stderr' });
    });

    proc.on('close', (code) => {
        pipeline.status = code === 0 ? 'complete' : 'failed';
        pipeline.endTime = new Date().toISOString();
        pipeline.exitCode = code;
        broadcast({ type: 'pipeline-complete', id, status: pipeline.status, exitCode: code });
        persistPipelines(); // Save state when pipeline completes
    });

    activePipelines.set(id, pipeline);
    broadcast({ type: 'pipeline-started', id, featureName });
    persistPipelines(); // Save state when pipeline starts

    return { id, pid: proc.pid, featureName };
}

function launchMultiplePipelines(features) {
    const results = [];
    for (const feature of features) {
        const result = launchPipeline(feature.name, feature.options || {});
        results.push(result);
    }
    return results;
}

function getPipelineStatus(id) {
    const pipeline = activePipelines.get(id);
    if (!pipeline) return null;

    return {
        id: pipeline.id,
        featureName: pipeline.featureName,
        status: pipeline.status,
        startTime: pipeline.startTime,
        endTime: pipeline.endTime,
        exitCode: pipeline.exitCode,
        logCount: pipeline.logs.length
    };
}

function getAllPipelines() {
    return Array.from(activePipelines.values()).map(p => ({
        id: p.id,
        featureName: p.featureName,
        status: p.status,
        startTime: p.startTime,
        endTime: p.endTime,
        pid: p.pid
    }));
}

function stopPipeline(id) {
    const pipeline = activePipelines.get(id);
    if (!pipeline) return false;

    try {
        // Kill the entire process tree (orchestrator + all child processes)
        if (pipeline.pid) {
            // Kill all child processes first
            exec(`pkill -TERM -P ${pipeline.pid}`, (err) => {
                // Then kill the main process
                try {
                    process.kill(pipeline.pid, 'SIGTERM');
                } catch (killErr) {
                    console.error('Failed to kill main process:', killErr.message);
                }
            });
        } else if (pipeline.process) {
            pipeline.process.kill('SIGTERM');
        }

        pipeline.status = 'stopped';
        persistPipelines(); // Save state when pipeline stops
        return true;
    } catch (err) {
        console.error('Failed to stop pipeline:', err.message);
        return false;
    }
}

// =============================================================================
// Logs
// =============================================================================

function getRecentLogs(limit = 20) {
    if (!fs.existsSync(LOGS_DIR)) {
        return [];
    }

    const files = fs.readdirSync(LOGS_DIR)
        .filter(f => f.endsWith('.log'))
        .sort()
        .reverse()
        .slice(0, limit);

    return files.map(f => ({
        name: f,
        path: path.join(LOGS_DIR, f),
        size: fs.statSync(path.join(LOGS_DIR, f)).size
    }));
}

function getLogContent(name) {
    const logPath = path.join(LOGS_DIR, name);
    if (fs.existsSync(logPath)) {
        return fs.readFileSync(logPath, 'utf-8');
    }
    return null;
}

// =============================================================================
// Game Server Management
// =============================================================================

function startGameServer() {
    if (gameServerProcess && !gameServerProcess.reconnected) {
        throw new Error('Game server is already running');
    }

    const GAME_DIR = path.join(PROJECT_ROOT, 'custom_game_engine/demo');

    const proc = spawn('npm', ['run', 'dev'], {
        cwd: GAME_DIR,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    gameServerProcess = proc;

    proc.stdout.on('data', (data) => {
        console.log(`[Game Server] ${data.toString().trim()}`);
    });

    proc.stderr.on('data', (data) => {
        console.error(`[Game Server] ${data.toString().trim()}`);
    });

    proc.on('close', (code) => {
        console.log(`Game server exited with code ${code}`);
        gameServerProcess = null;
        persistGameServer(); // Clear persisted state when server stops
    });

    persistGameServer(); // Save state when server starts

    return {
        status: 'starting',
        pid: proc.pid,
        url: `http://localhost:${GAME_SERVER_PORT}`
    };
}

function stopGameServer() {
    if (!gameServerProcess) {
        throw new Error('Game server is not running');
    }

    // If it's a reconnected process (we don't have the handle), try to kill by PID
    if (gameServerProcess.reconnected) {
        try {
            process.kill(gameServerProcess.pid, 'SIGTERM');
        } catch (err) {
            console.error('Failed to kill reconnected process:', err.message);
        }
    } else {
        gameServerProcess.kill('SIGTERM');
    }

    gameServerProcess = null;
    persistGameServer(); // Clear persisted state when server stops
    return { status: 'stopped' };
}

function getGameServerStatus() {
    return {
        running: gameServerProcess !== null,
        pid: gameServerProcess ? gameServerProcess.pid : null,
        url: `http://localhost:${GAME_SERVER_PORT}`
    };
}

// =============================================================================
// Parallel Workers Management
// =============================================================================

function startParallelWorkers(options = {}) {
    if (parallelWorkersProcess && !parallelWorkersProcess.reconnected) {
        throw new Error('Parallel workers are already running');
    }

    const scriptPath = path.join(SCRIPTS_DIR, 'parallel-workers.sh');
    const args = [];

    if (options.numWorkers) {
        args.push('-n', options.numWorkers.toString());
    }

    if (options.features && Array.isArray(options.features)) {
        args.push('--features', options.features.join(','));
    }

    const proc = spawn('bash', [scriptPath, ...args], {
        cwd: PROJECT_ROOT,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    parallelWorkersProcess = {
        pid: proc.pid,
        startTime: new Date().toISOString(),
        numWorkers: options.numWorkers || 3,
        features: options.features || [],
        logs: []
    };

    proc.stdout.on('data', (data) => {
        const log = data.toString();
        parallelWorkersProcess.logs.push({ type: 'stdout', text: log, time: new Date().toISOString() });
        // Keep only last 500 log entries
        if (parallelWorkersProcess.logs.length > 500) {
            parallelWorkersProcess.logs = parallelWorkersProcess.logs.slice(-500);
        }
        broadcast({ type: 'parallel-workers-log', log, stream: 'stdout' });
    });

    proc.stderr.on('data', (data) => {
        const log = data.toString();
        parallelWorkersProcess.logs.push({ type: 'stderr', text: log, time: new Date().toISOString() });
        if (parallelWorkersProcess.logs.length > 500) {
            parallelWorkersProcess.logs = parallelWorkersProcess.logs.slice(-500);
        }
        broadcast({ type: 'parallel-workers-log', log, stream: 'stderr' });
    });

    proc.on('close', (code) => {
        console.log(`Parallel workers exited with code ${code}`);
        parallelWorkersProcess = null;
        persistParallelWorkers();
        broadcast({ type: 'parallel-workers-stopped', exitCode: code });
    });

    persistParallelWorkers();
    broadcast({ type: 'parallel-workers-started', pid: proc.pid, numWorkers: options.numWorkers || 3 });

    return {
        status: 'starting',
        pid: proc.pid,
        numWorkers: options.numWorkers || 3
    };
}

function stopParallelWorkers() {
    if (!parallelWorkersProcess) {
        throw new Error('Parallel workers are not running');
    }

    const pid = parallelWorkersProcess.pid;

    // Kill the process tree
    exec(`pkill -TERM -P ${pid}`, (err) => {
        try {
            process.kill(pid, 'SIGTERM');
        } catch (killErr) {
            console.error('Failed to kill parallel workers:', killErr.message);
        }
    });

    parallelWorkersProcess = null;
    persistParallelWorkers();

    return { status: 'stopped' };
}

function getParallelWorkersStatus() {
    if (!parallelWorkersProcess) {
        return { running: false };
    }

    // Check if process is still alive
    try {
        process.kill(parallelWorkersProcess.pid, 0);
    } catch (err) {
        // Process is dead
        parallelWorkersProcess = null;
        persistParallelWorkers();
        return { running: false };
    }

    return {
        running: true,
        pid: parallelWorkersProcess.pid,
        startTime: parallelWorkersProcess.startTime,
        numWorkers: parallelWorkersProcess.numWorkers,
        features: parallelWorkersProcess.features,
        logCount: parallelWorkersProcess.logs ? parallelWorkersProcess.logs.length : 0
    };
}

function getParallelWorkersLogs() {
    if (!parallelWorkersProcess || !parallelWorkersProcess.logs) {
        return [];
    }
    return parallelWorkersProcess.logs;
}

function persistParallelWorkers() {
    if (!parallelWorkersProcess) {
        if (fs.existsSync(PARALLEL_WORKERS_STATE_FILE)) {
            fs.unlinkSync(PARALLEL_WORKERS_STATE_FILE);
        }
        return;
    }

    const data = {
        pid: parallelWorkersProcess.pid,
        startTime: parallelWorkersProcess.startTime,
        numWorkers: parallelWorkersProcess.numWorkers,
        features: parallelWorkersProcess.features
    };

    try {
        fs.writeFileSync(PARALLEL_WORKERS_STATE_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Failed to persist parallel workers state:', err.message);
    }
}

function loadPersistedParallelWorkers() {
    if (!fs.existsSync(PARALLEL_WORKERS_STATE_FILE)) {
        return;
    }

    try {
        const data = JSON.parse(fs.readFileSync(PARALLEL_WORKERS_STATE_FILE, 'utf-8'));

        // Check if process is still running
        try {
            process.kill(data.pid, 0);

            // Process exists, reconnect
            parallelWorkersProcess = {
                ...data,
                reconnected: true,
                logs: []
            };
            console.log(`  ↻ Reconnected to parallel workers (PID: ${data.pid})`);
        } catch (err) {
            // Process doesn't exist anymore
            fs.unlinkSync(PARALLEL_WORKERS_STATE_FILE);
            console.log(`  🧹 Cleaned up stale parallel workers state`);
        }
    } catch (err) {
        console.error('Failed to load persisted parallel workers:', err.message);
    }
}

// =============================================================================
// SSE for Real-Time Updates
// =============================================================================

function broadcast(data) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
        client.write(message);
    }
}

// =============================================================================
// API Routes
// =============================================================================

// Roadmap
app.get('/api/roadmap', (req, res) => {
    try {
        const phases = parseRoadmap();
        res.json({ phases, timestamp: new Date().toISOString() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/roadmap/raw', (req, res) => {
    try {
        res.type('text/markdown').send(getRoadmapRaw());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Work Orders
app.get('/api/work-orders', (req, res) => {
    try {
        res.json(getWorkOrders());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/work-orders/:name', (req, res) => {
    try {
        const content = getWorkOrderContent(req.params.name);
        if (!content) {
            return res.status(404).json({ error: 'Work order not found' });
        }
        res.json({ name: req.params.name, content });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/work-orders/:name/playtest-report', (req, res) => {
    try {
        const report = getPlaytestReport(req.params.name);
        if (!report) {
            return res.status(404).json({ error: 'Playtest report not found' });
        }
        res.json({ name: req.params.name, report });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/work-orders/:name/screenshots', (req, res) => {
    try {
        res.json(getScreenshots(req.params.name));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/work-orders/:name/screenshots/:file', (req, res) => {
    const filePath = path.join(WORK_ORDERS_DIR, req.params.name, 'screenshots', req.params.file);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Screenshot not found');
    }
});

// Pipelines
app.post('/api/pipelines', (req, res) => {
    try {
        const { featureName, options } = req.body;
        const result = launchPipeline(featureName, options);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/pipelines/batch', (req, res) => {
    try {
        const { features } = req.body;
        if (!Array.isArray(features)) {
            return res.status(400).json({ error: 'features must be an array' });
        }
        const results = launchMultiplePipelines(features);
        res.json({ pipelines: results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/pipelines', (req, res) => {
    try {
        res.json(getAllPipelines());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/pipelines/:id', (req, res) => {
    try {
        const status = getPipelineStatus(req.params.id);
        if (!status) {
            return res.status(404).json({ error: 'Pipeline not found' });
        }
        res.json(status);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/pipelines/:id/logs', (req, res) => {
    try {
        const pipeline = activePipelines.get(req.params.id);
        if (!pipeline) {
            return res.status(404).json({ error: 'Pipeline not found' });
        }
        res.json(pipeline.logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/pipelines/:id/stop', (req, res) => {
    try {
        const success = stopPipeline(req.params.id);
        res.json({ success });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/pipelines/:id', (req, res) => {
    try {
        const pipeline = activePipelines.get(req.params.id);
        if (!pipeline) {
            return res.status(404).json({ error: 'Pipeline not found' });
        }

        // Only allow deletion of non-running pipelines
        if (pipeline.status === 'running') {
            return res.status(400).json({ error: 'Cannot delete running pipeline. Stop it first.' });
        }

        activePipelines.delete(req.params.id);
        persistPipelines(); // Update persisted state
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Logs
app.get('/api/logs', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        res.json(getRecentLogs(limit));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/logs/:name', (req, res) => {
    try {
        const content = getLogContent(req.params.name);
        if (content === null) {
            return res.status(404).json({ error: 'Log not found' });
        }
        res.type('text/plain').send(content || '(empty log file)');
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Server stats
const serverStartTime = Date.now();

app.get('/api/server/stats', (req, res) => {
    const uptime = Date.now() - serverStartTime;
    res.json({
        connectedSessions: sseClients.size,
        uptime: Math.floor(uptime / 1000), // seconds
        port: PORT,
        url: `http://localhost:${PORT}`
    });
});

app.post('/api/server/restart', (req, res) => {
    res.json({ message: 'Server restarting...' });
    setTimeout(() => {
        process.exit(0); // Exit cleanly, assuming something restarts it
    }, 100);
});

// SSE endpoint
app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    sseClients.add(res);

    // Send heartbeat
    const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n');
    }, 30000);

    req.on('close', () => {
        clearInterval(heartbeat);
        sseClients.delete(res);
    });
});

// Build status
app.get('/api/build-status', (req, res) => {
    exec('cd custom_game_engine && npm run build 2>&1', { cwd: PROJECT_ROOT }, (error, stdout, stderr) => {
        res.json({
            success: !error,
            output: stdout + stderr,
            timestamp: new Date().toISOString()
        });
    });
});

// Test status
app.get('/api/test-status', (req, res) => {
    exec('cd custom_game_engine && npm test 2>&1', { cwd: PROJECT_ROOT, timeout: 120000 }, (error, stdout, stderr) => {
        res.json({
            success: !error,
            output: stdout + stderr,
            timestamp: new Date().toISOString()
        });
    });
});

// Game server control
app.post('/api/game-server/start', (req, res) => {
    try {
        const result = startGameServer();
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/game-server/stop', (req, res) => {
    try {
        const result = stopGameServer();
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/game-server/restart', (req, res) => {
    try {
        if (gameServerProcess) {
            stopGameServer();
        }
        // Wait a moment before restarting
        setTimeout(() => {
            const result = startGameServer();
            res.json(result);
        }, 1000);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/game-server/status', (req, res) => {
    try {
        res.json(getGameServerStatus());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Parallel Workers control
app.post('/api/parallel-workers/start', (req, res) => {
    try {
        const { numWorkers, features } = req.body || {};
        const result = startParallelWorkers({ numWorkers, features });
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/parallel-workers/stop', (req, res) => {
    try {
        const result = stopParallelWorkers();
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/parallel-workers/status', (req, res) => {
    try {
        res.json(getParallelWorkersStatus());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/parallel-workers/logs', (req, res) => {
    try {
        res.json(getParallelWorkersLogs());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================================================
// Start Server
// =============================================================================

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║         AI Village Orchestration Dashboard                   ║
╠══════════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}                    ║
║  Project root: ${PROJECT_ROOT}
║  Roadmap: ${ROADMAP_PATH}
╚══════════════════════════════════════════════════════════════╝
    `);

    // Load any persisted state from previous runs
    loadPersistedPipelines();
    loadPersistedGameServer();
    loadPersistedParallelWorkers();

    // Watch for externally-launched pipelines
    watchPipelinesFile();
    console.log('  👁️  Watching for external pipelines');
});
