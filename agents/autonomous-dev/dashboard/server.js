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
    const id = `pipeline-${Date.now()}`;
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

    const pipeline = {
        id,
        featureName: featureName || 'auto',
        startTime: new Date().toISOString(),
        status: 'running',
        logs: [],
        process: null
    };

    const proc = spawn('bash', [scriptPath, ...args], {
        cwd: PROJECT_ROOT,
        env: { ...process.env, MAX_IMPL_RETRIES: '3', MAX_PLAYTEST_RETRIES: '5' }
    });

    pipeline.process = proc;
    pipeline.pid = proc.pid;

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
    });

    activePipelines.set(id, pipeline);
    broadcast({ type: 'pipeline-started', id, featureName });

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
    if (!pipeline || !pipeline.process) return false;

    pipeline.process.kill('SIGTERM');
    pipeline.status = 'stopped';
    return true;
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
        if (!content) {
            return res.status(404).json({ error: 'Log not found' });
        }
        res.type('text/plain').send(content);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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
});
