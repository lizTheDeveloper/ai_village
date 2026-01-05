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

// Load environment variables from custom_game_engine/.env
const GAME_ENGINE_DIR = path.resolve(__dirname, '../../../custom_game_engine');
const ENV_FILE = path.join(GAME_ENGINE_DIR, '.env');

// Simple .env parser (no dependencies needed)
function loadEnvFile(filePath) {
    const env = {};
    if (!fs.existsSync(filePath)) {
        console.log(`  ⚠️  No .env file found at ${filePath}`);
        return env;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
            env[key.trim()] = valueParts.join('=').trim();
        }
    }
    return env;
}

// Load .env file
const gameEnv = loadEnvFile(ENV_FILE);
console.log(`  📄 Loaded ${Object.keys(gameEnv).length} environment variables from .env`);

const app = express();
const PORT = process.env.PORT || 3030;

// Paths
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const ROADMAP_PATH = path.join(PROJECT_ROOT, 'MASTER_ROADMAP.md');
const WORK_ORDERS_DIR = path.join(__dirname, '../work-orders');
const OPENSPEC_CHANGES_DIR = path.join(PROJECT_ROOT, 'openspec/changes');
const BUGS_DIR = path.join(__dirname, '../bugs');
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

// Bug queue processor
let bugQueueProcessorProcess = null;
const BUG_QUEUE_PROCESSOR_STATE_FILE = path.join(__dirname, '.bug-queue-processor.json');

// Persistence file for pipeline state
const PIPELINES_STATE_FILE = path.join(__dirname, '.pipelines.json');
const GAME_SERVER_STATE_FILE = path.join(__dirname, '.game-server.json');
const BUGS_INDEX_FILE = path.join(BUGS_DIR, '.bugs-index.json');

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
    const orders = [];
    const openspecNames = new Set();

    // Read from OpenSpec changes directory FIRST (higher priority)
    if (fs.existsSync(OPENSPEC_CHANGES_DIR)) {
        const dirs = fs.readdirSync(OPENSPEC_CHANGES_DIR).filter(d => {
            if (d === 'archive' || d === '_archived') return false;
            const stat = fs.statSync(path.join(OPENSPEC_CHANGES_DIR, d));
            return stat.isDirectory();
        });

        for (const dir of dirs) {
            const proposalPath = path.join(OPENSPEC_CHANGES_DIR, dir);
            const proposalFile = path.join(proposalPath, 'proposal.md');
            const tasksFile = path.join(proposalPath, 'tasks.md');

            if (!fs.existsSync(proposalFile)) continue;

            const proposalContent = fs.readFileSync(proposalFile, 'utf-8');

            // Parse OpenSpec metadata
            const statusMatch = proposalContent.match(/\*\*Status:\*\*\s*(.+)/);
            const priorityMatch = proposalContent.match(/\*\*Priority:\*\*\s*(.+)/);
            const complexityMatch = proposalContent.match(/\*\*Complexity:\*\*\s*(.+)/);

            const order = {
                name: dir,
                source: 'openspec',
                state: statusMatch ? statusMatch[1].trim() : 'Draft',
                priority: priorityMatch ? priorityMatch[1].trim() : null,
                complexity: complexityMatch ? complexityMatch[1].trim() : null,
                hasWorkOrder: true, // proposal.md is equivalent
                hasPlaytestReport: false,
                hasTasks: fs.existsSync(tasksFile),
                screenshotCount: 0,
                verdict: null
            };

            // Map OpenSpec status to old verdict system
            if (order.state === 'Approved') order.verdict = 'APPROVED';
            else if (order.state === 'Blocked') order.verdict = 'BLOCKED';
            else if (order.state === 'Needs Work') order.verdict = 'NEEDS_WORK';

            openspecNames.add(dir);
            orders.push(order);
        }
    }

    // Read from old work-orders directory (only if not in OpenSpec)
    if (fs.existsSync(WORK_ORDERS_DIR)) {
        const dirs = fs.readdirSync(WORK_ORDERS_DIR).filter(d => {
            if (d === 'archive' || d === '_archived') return false;
            const stat = fs.statSync(path.join(WORK_ORDERS_DIR, d));
            return stat.isDirectory();
        });

        for (const dir of dirs) {
            // Skip if already in OpenSpec
            if (openspecNames.has(dir)) continue;

            const orderPath = path.join(WORK_ORDERS_DIR, dir);
            const statePath = path.join(orderPath, '.state');
            const workOrderPath = path.join(orderPath, 'work-order.md');
            const playtestPath = path.join(orderPath, 'playtest-report.md');
            const screenshotsDir = path.join(orderPath, 'screenshots');

            const order = {
                name: dir,
                source: 'work-orders',
                state: fs.existsSync(statePath) ? fs.readFileSync(statePath, 'utf-8').trim() : 'NEW',
                hasWorkOrder: fs.existsSync(workOrderPath),
                hasPlaytestReport: fs.existsSync(playtestPath),
                screenshotCount: 0,
                verdict: null,
                priority: null,
                complexity: null
            };

            if (fs.existsSync(screenshotsDir)) {
                order.screenshotCount = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png')).length;
            }

            if (order.hasPlaytestReport) {
                const report = fs.readFileSync(playtestPath, 'utf-8');
                if (report.includes('APPROVED')) order.verdict = 'APPROVED';
                else if (report.includes('NEEDS_WORK')) order.verdict = 'NEEDS_WORK';
                else if (report.includes('BLOCKED')) order.verdict = 'BLOCKED';
            }

            orders.push(order);
        }
    }

    return orders;
}

function getWorkOrderContent(name) {
    // Try old work-orders directory first
    const workOrderPath = path.join(WORK_ORDERS_DIR, name, 'work-order.md');
    if (fs.existsSync(workOrderPath)) {
        return fs.readFileSync(workOrderPath, 'utf-8');
    }

    // Try OpenSpec changes directory
    const proposalPath = path.join(OPENSPEC_CHANGES_DIR, name, 'proposal.md');
    if (fs.existsSync(proposalPath)) {
        return fs.readFileSync(proposalPath, 'utf-8');
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
// Bug Queue Management
// =============================================================================

// Ensure bugs directory exists
function ensureBugsDir() {
    if (!fs.existsSync(BUGS_DIR)) {
        fs.mkdirSync(BUGS_DIR, { recursive: true });
    }
}

// Load bugs index
function loadBugsIndex() {
    ensureBugsDir();
    if (!fs.existsSync(BUGS_INDEX_FILE)) {
        return [];
    }

    const data = fs.readFileSync(BUGS_INDEX_FILE, 'utf-8');
    if (!data.trim()) {
        return [];
    }
    return JSON.parse(data);
}

// Save bugs index
function saveBugsIndex(bugs) {
    ensureBugsDir();
    fs.writeFileSync(BUGS_INDEX_FILE, JSON.stringify(bugs, null, 2));
}

// Generate unique bug ID
function generateBugId() {
    const timestamp = Date.now();
    const shortId = Math.random().toString(36).substring(2, 8);
    return `bug-${timestamp}-${shortId}`;
}

// Create a new bug
function createBug(bugData) {
    const bugs = loadBugsIndex();

    if (!bugData.title) {
        throw new Error('Bug title is required');
    }

    const bug = {
        id: generateBugId(),
        title: bugData.title,
        description: bugData.description || '',
        status: 'NEW',
        priority: bugData.priority || 'MEDIUM',
        source: bugData.source || 'manual',
        sourceRef: bugData.sourceRef || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignedTo: null,
        reproduceSteps: bugData.reproduceSteps || '',
        errorLog: bugData.errorLog || '',
        fixPipelineId: null
    };

    // Create bug directory
    const bugDir = path.join(BUGS_DIR, bug.id);
    fs.mkdirSync(bugDir, { recursive: true });

    // Write bug details
    const bugReportPath = path.join(bugDir, 'bug-report.md');
    const bugReport = `# ${bug.title}

**ID:** ${bug.id}
**Status:** ${bug.status}
**Priority:** ${bug.priority}
**Source:** ${bug.source}${bug.sourceRef ? ` (${bug.sourceRef})` : ''}
**Created:** ${bug.createdAt}

## Description

${bug.description}

${bug.reproduceSteps ? `## Steps to Reproduce\n\n${bug.reproduceSteps}\n` : ''}
${bug.errorLog ? `## Error Log\n\n\`\`\`\n${bug.errorLog}\n\`\`\`\n` : ''}
`;

    fs.writeFileSync(bugReportPath, bugReport);

    // Write state file
    const statePath = path.join(bugDir, '.state');
    fs.writeFileSync(statePath, bug.status);

    // Add to index
    bugs.push(bug);
    saveBugsIndex(bugs);

    broadcast({ type: 'bug-created', bug });

    return bug;
}

// Get all bugs
function getAllBugs() {
    return loadBugsIndex();
}

// Get bug by ID
function getBugById(id) {
    const bugs = loadBugsIndex();
    const bug = bugs.find(b => b.id === id);
    if (!bug) {
        throw new Error(`Bug not found: ${id}`);
    }
    return bug;
}

// Update bug status
function updateBugStatus(id, status) {
    const validStatuses = ['NEW', 'IN_PROGRESS', 'READY_FOR_TEST', 'VERIFIED', 'CLOSED'];
    if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
    }

    const bugs = loadBugsIndex();
    const bug = bugs.find(b => b.id === id);
    if (!bug) {
        throw new Error(`Bug not found: ${id}`);
    }

    bug.status = status;
    bug.updatedAt = new Date().toISOString();

    // Update state file
    const statePath = path.join(BUGS_DIR, id, '.state');
    fs.writeFileSync(statePath, status);

    // Update index
    saveBugsIndex(bugs);

    broadcast({ type: 'bug-updated', bug });

    return bug;
}

// Update bug assignment
function assignBug(id, assignee) {
    const bugs = loadBugsIndex();
    const bug = bugs.find(b => b.id === id);
    if (!bug) {
        throw new Error(`Bug not found: ${id}`);
    }

    bug.assignedTo = assignee;
    bug.updatedAt = new Date().toISOString();

    saveBugsIndex(bugs);
    broadcast({ type: 'bug-updated', bug });

    return bug;
}

// Link bug to fix pipeline
function linkBugToPipeline(id, pipelineId) {
    const bugs = loadBugsIndex();
    const bug = bugs.find(b => b.id === id);
    if (!bug) {
        throw new Error(`Bug not found: ${id}`);
    }

    bug.fixPipelineId = pipelineId;
    bug.updatedAt = new Date().toISOString();

    if (bug.status === 'NEW') {
        bug.status = 'IN_PROGRESS';
    }

    saveBugsIndex(bugs);
    broadcast({ type: 'bug-updated', bug });

    return bug;
}

// Delete bug
function deleteBug(id) {
    const bugs = loadBugsIndex();
    const bugIndex = bugs.findIndex(b => b.id === id);
    if (bugIndex === -1) {
        throw new Error(`Bug not found: ${id}`);
    }

    bugs.splice(bugIndex, 1);
    saveBugsIndex(bugs);

    // Remove bug directory
    const bugDir = path.join(BUGS_DIR, id);
    if (fs.existsSync(bugDir)) {
        fs.rmSync(bugDir, { recursive: true });
    }

    broadcast({ type: 'bug-deleted', id });

    return { success: true };
}

// Auto-detect bugs from pipeline failures
function detectBugFromPipeline(pipelineId) {
    const pipeline = activePipelines.get(pipelineId);
    if (!pipeline) {
        throw new Error(`Pipeline not found: ${pipelineId}`);
    }

    if (pipeline.status !== 'failed') {
        return null; // Only create bugs for failed pipelines
    }

    // Extract error from logs
    const errorLogs = pipeline.logs
        .filter(log => log.type === 'stderr')
        .map(log => log.text)
        .join('\n');

    const bug = createBug({
        title: `Pipeline failure: ${pipeline.featureName}`,
        description: `Automated bug created from failed pipeline ${pipelineId}`,
        priority: 'HIGH',
        source: 'pipeline-failure',
        sourceRef: pipelineId,
        errorLog: errorLogs.substring(0, 5000) // Limit to 5000 chars
    });

    return bug;
}

// Get next bug from queue (for autonomous processing)
function getNextBugFromQueue() {
    const bugs = loadBugsIndex();

    // Priority order: CRITICAL > HIGH > MEDIUM > LOW
    const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };

    // Filter to unassigned NEW bugs
    const availableBugs = bugs
        .filter(b => b.status === 'NEW' && !b.assignedTo)
        .sort((a, b) => {
            // Sort by priority first
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;

            // Then by creation time (older first)
            return new Date(a.createdAt) - new Date(b.createdAt);
        });

    return availableBugs.length > 0 ? availableBugs[0] : null;
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

    // Merge environment variables: process.env + gameEnv from .env file
    const mergedEnv = { ...process.env, ...gameEnv };

    console.log(`[Game Server] Starting with ${Object.keys(gameEnv).length} custom env vars from .env`);

    const proc = spawn('npm', ['run', 'dev'], {
        cwd: GAME_DIR,
        env: mergedEnv,
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
// Bug Queue Processor Management
// =============================================================================

function startBugQueueProcessor() {
    if (bugQueueProcessorProcess && !bugQueueProcessorProcess.reconnected) {
        throw new Error('Bug queue processor is already running');
    }

    const scriptPath = path.join(SCRIPTS_DIR, 'bug-queue-processor.sh');

    const proc = spawn('bash', [scriptPath], {
        cwd: PROJECT_ROOT,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    bugQueueProcessorProcess = {
        pid: proc.pid,
        startTime: new Date().toISOString(),
        logs: []
    };

    proc.stdout.on('data', (data) => {
        const log = data.toString();
        bugQueueProcessorProcess.logs.push({ type: 'stdout', text: log, time: new Date().toISOString() });
        if (bugQueueProcessorProcess.logs.length > 500) {
            bugQueueProcessorProcess.logs = bugQueueProcessorProcess.logs.slice(-500);
        }
        broadcast({ type: 'bug-queue-processor-log', log, stream: 'stdout' });
    });

    proc.stderr.on('data', (data) => {
        const log = data.toString();
        bugQueueProcessorProcess.logs.push({ type: 'stderr', text: log, time: new Date().toISOString() });
        if (bugQueueProcessorProcess.logs.length > 500) {
            bugQueueProcessorProcess.logs = bugQueueProcessorProcess.logs.slice(-500);
        }
        broadcast({ type: 'bug-queue-processor-log', log, stream: 'stderr' });
    });

    proc.on('close', (code) => {
        console.log(`Bug queue processor exited with code ${code}`);
        bugQueueProcessorProcess = null;
        persistBugQueueProcessor();
        broadcast({ type: 'bug-queue-processor-stopped', exitCode: code });
    });

    persistBugQueueProcessor();
    broadcast({ type: 'bug-queue-processor-started', pid: proc.pid });

    return {
        status: 'starting',
        pid: proc.pid
    };
}

function stopBugQueueProcessor() {
    if (!bugQueueProcessorProcess) {
        throw new Error('Bug queue processor is not running');
    }

    const pid = bugQueueProcessorProcess.pid;

    exec(`pkill -TERM -P ${pid}`, (err) => {
        try {
            process.kill(pid, 'SIGTERM');
        } catch (killErr) {
            console.error('Failed to kill bug queue processor:', killErr.message);
        }
    });

    bugQueueProcessorProcess = null;
    persistBugQueueProcessor();

    return { status: 'stopped' };
}

function getBugQueueProcessorStatus() {
    if (!bugQueueProcessorProcess) {
        return { running: false };
    }

    try {
        process.kill(bugQueueProcessorProcess.pid, 0);
    } catch (err) {
        bugQueueProcessorProcess = null;
        persistBugQueueProcessor();
        return { running: false };
    }

    return {
        running: true,
        pid: bugQueueProcessorProcess.pid,
        startTime: bugQueueProcessorProcess.startTime,
        logCount: bugQueueProcessorProcess.logs ? bugQueueProcessorProcess.logs.length : 0
    };
}

function getBugQueueProcessorLogs() {
    if (!bugQueueProcessorProcess || !bugQueueProcessorProcess.logs) {
        return [];
    }
    return bugQueueProcessorProcess.logs;
}

function persistBugQueueProcessor() {
    if (!bugQueueProcessorProcess) {
        if (fs.existsSync(BUG_QUEUE_PROCESSOR_STATE_FILE)) {
            fs.unlinkSync(BUG_QUEUE_PROCESSOR_STATE_FILE);
        }
        return;
    }

    const data = {
        pid: bugQueueProcessorProcess.pid,
        startTime: bugQueueProcessorProcess.startTime
    };

    try {
        fs.writeFileSync(BUG_QUEUE_PROCESSOR_STATE_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Failed to persist bug queue processor state:', err.message);
    }
}

function loadPersistedBugQueueProcessor() {
    if (!fs.existsSync(BUG_QUEUE_PROCESSOR_STATE_FILE)) {
        return;
    }

    try {
        const data = JSON.parse(fs.readFileSync(BUG_QUEUE_PROCESSOR_STATE_FILE, 'utf-8'));

        try {
            process.kill(data.pid, 0);

            bugQueueProcessorProcess = {
                ...data,
                reconnected: true,
                logs: []
            };
            console.log(`  ↻ Reconnected to bug queue processor (PID: ${data.pid})`);
        } catch (err) {
            fs.unlinkSync(BUG_QUEUE_PROCESSOR_STATE_FILE);
            console.log(`  🧹 Cleaned up stale bug queue processor state`);
        }
    } catch (err) {
        console.error('Failed to load persisted bug queue processor:', err.message);
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
// Orchestrator Management
// =============================================================================

function restartAllOrchestrators() {
    return new Promise((resolve, reject) => {
        // Find all orchestrator processes
        exec('ps aux | grep "orchestrator.sh" | grep -v grep', (error, stdout, stderr) => {
            if (error && !stdout) {
                // No orchestrators running
                resolve({ success: true, restarted: [] });
                return;
            }

            const lines = stdout.trim().split('\n').filter(line => line);
            const orchestrators = [];

            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                const pid = parseInt(parts[1]);

                // Extract the feature name from command line
                let featureName = null;
                let isResume = false;

                if (line.includes('--feature')) {
                    const match = line.match(/--feature\s+(\S+)/);
                    if (match) {
                        featureName = match[1];
                    }
                } else if (line.includes('--resume')) {
                    const match = line.match(/--resume\s+(\S+)/);
                    if (match) {
                        featureName = match[1];
                        isResume = true;
                    }
                }

                if (featureName) {
                    orchestrators.push({ pid, featureName, isResume });
                }
            }

            if (orchestrators.length === 0) {
                resolve({ success: true, restarted: [] });
                return;
            }

            // Kill all orchestrators
            const killPromises = orchestrators.map(orch => {
                return new Promise((killResolve) => {
                    try {
                        process.kill(orch.pid, 'SIGTERM');
                        killResolve();
                    } catch (err) {
                        console.error(`Failed to kill orchestrator PID ${orch.pid}:`, err.message);
                        killResolve();
                    }
                });
            });

            Promise.all(killPromises).then(() => {
                // Wait a moment for processes to clean up
                setTimeout(() => {
                    // Restart each orchestrator
                    const restarted = [];

                    for (const orch of orchestrators) {
                        try {
                            const scriptPath = path.join(SCRIPTS_DIR, 'orchestrator.sh');
                            const args = orch.isResume
                                ? ['--resume', orch.featureName]
                                : ['--feature', orch.featureName];

                            const logFile = path.join(LOGS_DIR, `${orch.featureName}-orchestrator.log`);
                            const proc = spawn('nohup', ['bash', scriptPath, ...args], {
                                cwd: PROJECT_ROOT,
                                detached: true,
                                stdio: ['ignore',
                                    fs.openSync(logFile, 'a'),
                                    fs.openSync(logFile, 'a')
                                ]
                            });

                            proc.unref(); // Allow parent to exit

                            restarted.push({
                                featureName: orch.featureName,
                                oldPid: orch.pid,
                                newPid: proc.pid,
                                mode: orch.isResume ? 'resume' : 'feature'
                            });

                            console.log(`Restarted orchestrator: ${orch.featureName} (old PID: ${orch.pid}, new PID: ${proc.pid})`);
                        } catch (err) {
                            console.error(`Failed to restart orchestrator ${orch.featureName}:`, err.message);
                        }
                    }

                    resolve({ success: true, restarted });
                }, 1000);
            }).catch(reject);
        });
    });
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

app.post('/api/work-orders/:name/archive', (req, res) => {
    try {
        const workOrderName = req.params.name;
        const sourcePath = path.join(WORK_ORDERS_DIR, workOrderName);
        const archiveDir = path.join(WORK_ORDERS_DIR, '_archived');
        let targetPath = path.join(archiveDir, workOrderName);

        // Check if work order exists
        if (!fs.existsSync(sourcePath)) {
            return res.status(404).json({ error: 'Work order not found' });
        }

        // Create archive directory if it doesn't exist
        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
        }

        // If target already exists, add timestamp to make unique
        if (fs.existsSync(targetPath)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            targetPath = path.join(archiveDir, `${workOrderName}_${timestamp}`);
        }

        // Move the work order to archive
        fs.renameSync(sourcePath, targetPath);

        res.json({ success: true, message: `Work order ${workOrderName} archived` });
    } catch (err) {
        res.status(500).json({ error: err.message });
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

    // Count active servers/processes
    let serversUp = 1; // Dashboard server itself
    if (gameServerProcess) serversUp++;
    if (parallelWorkersProcess) serversUp++;
    if (bugQueueProcessorProcess) serversUp++;

    res.json({
        connectedSessions: sseClients.size,
        serversUp: serversUp,
        uptime: Math.floor(uptime / 1000), // seconds
        port: PORT,
        url: `http://localhost:${PORT}`,
        services: {
            dashboard: true,
            gameServer: gameServerProcess !== null,
            parallelWorkers: parallelWorkersProcess !== null,
            bugQueueProcessor: bugQueueProcessorProcess !== null
        }
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
    console.log(`  📡 New SSE client connected (${sseClients.size} total sessions)`);

    // Broadcast session count update
    broadcast({ type: 'session-update', count: sseClients.size });

    // Send heartbeat
    const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n');
    }, 30000);

    req.on('close', () => {
        clearInterval(heartbeat);
        sseClients.delete(res);
        console.log(`  📡 SSE client disconnected (${sseClients.size} remaining sessions)`);
        // Broadcast session count update
        broadcast({ type: 'session-update', count: sseClients.size });
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

// Kill all servers (game server + parallel workers + metrics)
app.post('/api/servers/kill-all', (req, res) => {
    try {
        const { execSync } = require('child_process');
        const results = {
            gameServer: null,
            parallelWorkers: null,
            metricsServer: null
        };

        // Stop game server if running
        try {
            results.gameServer = stopGameServer();
        } catch (err) {
            results.gameServer = { error: err.message };
        }

        // Stop parallel workers if running
        try {
            results.parallelWorkers = stopParallelWorkers();
        } catch (err) {
            results.parallelWorkers = { error: err.message };
        }

        // Stop metrics server (port 8766) - use spawn to avoid hanging
        try {
            const { spawn } = require('child_process');
            spawn('sh', ['-c', 'lsof -ti:8766 | xargs kill -9 2>/dev/null'], { detached: true, stdio: 'ignore' }).unref();
            results.metricsServer = { status: 'stopped' };
        } catch (err) {
            results.metricsServer = { status: 'not running or already stopped' };
        }

        res.json({ success: true, results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PixelLab Daemon Status
app.get('/api/pixellab/status', (req, res) => {
    try {
        const daemonStatePath = path.join(GAME_ENGINE_DIR, 'scripts', 'pixellab-daemon-state.json');

        if (fs.existsSync(daemonStatePath)) {
            const daemonState = JSON.parse(fs.readFileSync(daemonStatePath, 'utf-8'));
            res.json({
                running: true,
                ...daemonState
            });
        } else {
            res.json({
                running: false,
                error: 'Daemon state file not found'
            });
        }
    } catch (err) {
        res.json({
            running: false,
            error: err.message
        });
    }
});

// Generation Queue (proxy to metrics server, fallback to queue file)
app.get('/api/generation/queue', async (req, res) => {
    try {
        const http = require('http');

        // Try to get from metrics server first
        const queuePromise = new Promise((resolve, reject) => {
            const request = http.get('http://localhost:8766/api/generation/queue', { timeout: 2000 }, (response) => {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Invalid JSON'));
                    }
                });
            });
            request.on('error', reject);
            request.on('timeout', () => {
                request.destroy();
                reject(new Error('Timeout'));
            });
        });

        try {
            const queue = await queuePromise;
            res.json(queue);
            return;
        } catch (metricsErr) {
            // Metrics server not running, try reading queue file directly
            const queueFilePath = path.join(GAME_ENGINE_DIR, 'sprite-generation-queue.json');

            if (fs.existsSync(queueFilePath)) {
                const queueData = JSON.parse(fs.readFileSync(queueFilePath, 'utf-8'));

                // Transform to expected format
                const sprites = queueData.sprites || [];
                const animations = queueData.animations || [];

                res.json({
                    summary: {
                        sprites: {
                            pending: sprites.filter(s => s.status === 'queued' || s.status === 'generating').length,
                            completed: sprites.filter(s => s.status === 'complete').length,
                            total: sprites.length,
                        },
                        animations: {
                            pending: animations.filter(a => a.status === 'queued' || a.status === 'generating').length,
                            completed: animations.filter(a => a.status === 'complete').length,
                            total: animations.length,
                        },
                    },
                    pending: {
                        sprites: sprites.filter(s => s.status === 'queued' || s.status === 'generating'),
                        animations: animations.filter(a => a.status === 'queued' || a.status === 'generating'),
                    },
                    completed: {
                        sprites: sprites.filter(s => s.status === 'complete').slice(-10),
                        animations: animations.filter(a => a.status === 'complete').slice(-10),
                    },
                });
                return;
            }

            // Neither metrics server nor queue file available
            throw new Error('Metrics server not running and no queue file found');
        }
    } catch (err) {
        res.json({
            summary: {
                sprites: { pending: 0, completed: 0, total: 0 },
                animations: { pending: 0, completed: 0, total: 0 },
            },
            pending: { sprites: [], animations: [] },
            completed: { sprites: [], animations: [] },
            error: err.message,
        });
    }
});

// Ollama status
app.get('/api/ollama/status', async (req, res) => {
    try {
        const http = require('http');

        // Check if Ollama is running by calling /api/tags
        const tagsPromise = new Promise((resolve, reject) => {
            const request = http.get('http://localhost:11434/api/tags', { timeout: 2000 }, (response) => {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Invalid JSON'));
                    }
                });
            });
            request.on('error', reject);
            request.on('timeout', () => {
                request.destroy();
                reject(new Error('Timeout'));
            });
        });

        // Check running models via /api/ps
        const psPromise = new Promise((resolve, reject) => {
            const request = http.get('http://localhost:11434/api/ps', { timeout: 2000 }, (response) => {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Invalid JSON'));
                    }
                });
            });
            request.on('error', reject);
            request.on('timeout', () => {
                request.destroy();
                reject(new Error('Timeout'));
            });
        });

        const [tags, ps] = await Promise.all([tagsPromise, psPromise]);

        res.json({
            running: true,
            availableModels: tags.models || [],
            loadedModels: ps.models || [],
            modelCount: (tags.models || []).length,
            loadedCount: (ps.models || []).length
        });
    } catch (err) {
        res.json({
            running: false,
            error: err.message,
            availableModels: [],
            loadedModels: [],
            modelCount: 0,
            loadedCount: 0
        });
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

// Bug Queue
app.get('/api/bugs', (req, res) => {
    try {
        res.json(getAllBugs());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/bugs/next', (req, res) => {
    try {
        const bug = getNextBugFromQueue();
        if (!bug) {
            return res.status(404).json({ error: 'No bugs in queue' });
        }
        res.json(bug);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/bugs/:id', (req, res) => {
    try {
        const bug = getBugById(req.params.id);
        res.json(bug);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
});

app.post('/api/bugs', (req, res) => {
    try {
        const bug = createBug(req.body);
        res.json(bug);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.patch('/api/bugs/:id/status', (req, res) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ error: 'status is required' });
        }
        const bug = updateBugStatus(req.params.id, status);
        res.json(bug);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.patch('/api/bugs/:id/assign', (req, res) => {
    try {
        const { assignee } = req.body;
        const bug = assignBug(req.params.id, assignee);
        res.json(bug);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/bugs/:id/link-pipeline', (req, res) => {
    try {
        const { pipelineId } = req.body;
        if (!pipelineId) {
            return res.status(400).json({ error: 'pipelineId is required' });
        }
        const bug = linkBugToPipeline(req.params.id, pipelineId);
        res.json(bug);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/bugs/:id', (req, res) => {
    try {
        const result = deleteBug(req.params.id);
        res.json(result);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
});

app.post('/api/bugs/detect-from-pipeline/:pipelineId', (req, res) => {
    try {
        const bug = detectBugFromPipeline(req.params.pipelineId);
        if (!bug) {
            return res.json({ message: 'No bug detected (pipeline did not fail)' });
        }
        res.json(bug);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Bug Queue Processor control
app.post('/api/bug-queue-processor/start', (req, res) => {
    try {
        const result = startBugQueueProcessor();
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/bug-queue-processor/stop', (req, res) => {
    try {
        const result = stopBugQueueProcessor();
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/bug-queue-processor/status', (req, res) => {
    try {
        res.json(getBugQueueProcessorStatus());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/bug-queue-processor/logs', (req, res) => {
    try {
        res.json(getBugQueueProcessorLogs());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================================================
// Server Registration API
// =============================================================================

// In-memory storage for registered servers
const registeredServers = new Map();

// Generate unique server ID
function generateServerId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `server-${timestamp}-${random}`;
}

// POST /api/servers/register - Register a server
app.post('/api/servers/register', (req, res) => {
    try {
        const { name, port, type, status, timestamp, pid, url } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({ error: 'name is required' });
        }
        if (!port) {
            return res.status(400).json({ error: 'port is required' });
        }
        if (!type) {
            return res.status(400).json({ error: 'type is required' });
        }

        // Generate unique server ID
        const serverId = generateServerId();

        // Store registration
        const registration = {
            serverId,
            name,
            port,
            type,
            status: status || 'unknown',
            timestamp: timestamp || Date.now(),
            pid: pid || null,
            url: url || `http://localhost:${port}`,
            registeredAt: new Date().toISOString()
        };

        registeredServers.set(serverId, registration);

        res.json({
            success: true,
            serverId,
            message: 'Server registered successfully'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/servers - List all registered servers
app.get('/api/servers', (req, res) => {
    try {
        const servers = Array.from(registeredServers.values());
        res.json(servers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Orchestrator restart
app.post('/api/orchestrators/restart-all', async (req, res) => {
    try {
        const result = await restartAllOrchestrators();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message, success: false });
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
    loadPersistedBugQueueProcessor();

    // Watch for externally-launched pipelines
    watchPipelinesFile();
    console.log('  👁️  Watching for external pipelines');
});
