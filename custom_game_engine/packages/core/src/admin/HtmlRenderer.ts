/**
 * HTML Renderer - Generates interactive HTML dashboard
 *
 * Produces a tabbed dashboard with:
 * - Auto-generated forms from capability schemas
 * - Real-time WebSocket updates
 * - Dark theme matching existing UI
 */

import {
  capabilityRegistry,
  type AdminCapability,
  type AdminAction,
  type AdminQuery,
  type AdminParam,
  type ViewContext,
} from './CapabilityRegistry.js';

// ============================================================================
// CSS Styles
// ============================================================================

const STYLES = `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Courier New', monospace;
  background: #0a0a0a;
  color: #00ff00;
  min-height: 100vh;
}

.container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 1rem;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 2px solid #00ff00;
  margin-bottom: 1rem;
}

h1 {
  font-size: 1.5rem;
  text-shadow: 0 0 10px #00ff00;
}

.status {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-dot.connected { background: #00ff00; }
.status-dot.disconnected { background: #ff0000; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Tabs */
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #111;
  border: 1px solid #333;
  margin-bottom: 1rem;
}

.tab {
  padding: 0.5rem 1rem;
  background: #1a1a1a;
  border: 1px solid #333;
  color: #888;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tab:hover {
  background: #222;
  color: #00ff00;
  border-color: #00ff00;
}

.tab.active {
  background: #00ff00;
  color: #0a0a0a;
  border-color: #00ff00;
  font-weight: bold;
}

.tab-icon {
  font-size: 1.2rem;
}

/* Tab Content */
.tab-content {
  display: none;
  padding: 1rem;
  background: #111;
  border: 1px solid #333;
}

.tab-content.active {
  display: block;
}

.tab-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #333;
}

.tab-header h2 {
  font-size: 1.3rem;
  color: #00ff00;
  margin-bottom: 0.5rem;
}

.tab-header p {
  color: #888;
}

/* Sections */
.section {
  margin-bottom: 2rem;
}

.section-header {
  font-size: 1rem;
  color: #00aa00;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px dashed #333;
}

/* Cards */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1rem;
}

.card {
  background: #0f0f0f;
  border: 1px solid #333;
  padding: 1rem;
  transition: all 0.2s;
}

.card:hover {
  border-color: #00ff00;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.2);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.card-title {
  font-weight: bold;
  color: #00ff00;
}

.card-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  background: #ff0000;
  color: #fff;
  border-radius: 3px;
}

.card-description {
  color: #888;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

/* Forms */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-field label {
  font-size: 0.8rem;
  color: #888;
}

.form-field input,
.form-field select,
.form-field textarea {
  background: #1a1a1a;
  border: 1px solid #333;
  color: #00ff00;
  padding: 0.5rem;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

.form-field input:focus,
.form-field select:focus,
.form-field textarea:focus {
  outline: none;
  border-color: #00ff00;
}

.form-field input[type="checkbox"] {
  width: auto;
}

.required::after {
  content: ' *';
  color: #ff0000;
}

/* Buttons */
.btn {
  background: #00aa00;
  color: #0a0a0a;
  border: 1px solid #00ff00;
  padding: 0.5rem 1rem;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  background: #00ff00;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
}

.btn.danger {
  background: #aa0000;
  border-color: #ff0000;
}

.btn.danger:hover {
  background: #ff0000;
  box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
}

.btn:disabled {
  background: #333;
  border-color: #555;
  color: #666;
  cursor: not-allowed;
}

/* Results */
.result {
  background: #0a0a0a;
  border: 1px solid #333;
  padding: 1rem;
  margin-top: 1rem;
  max-height: 300px;
  overflow: auto;
  display: none;
}

.result.active {
  display: block;
}

.result.success {
  border-color: #00ff00;
}

.result.error {
  border-color: #ff0000;
  color: #ff6666;
}

.result pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 0.85rem;
}

/* Live Data Display */
.live-data {
  background: #0a0a0a;
  border: 1px solid #333;
  padding: 1rem;
  min-height: 100px;
  max-height: 400px;
  overflow: auto;
}

.live-data.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
}

.live-data.success {
  border-color: #00aa00;
}

.live-data.error {
  border-color: #ff0000;
  color: #ff6666;
}

.live-data pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 0.85rem;
  margin: 0;
}

.live-data-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.live-data-timestamp {
  font-size: 0.7rem;
  color: #666;
}

.live-data-refresh {
  background: transparent;
  border: 1px solid #333;
  color: #666;
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  cursor: pointer;
  font-family: 'Courier New', monospace;
}

.live-data-refresh:hover {
  border-color: #00ff00;
  color: #00ff00;
}

.live-data-refresh.spinning {
  animation: spin 1s linear infinite;
}

/* Data table styling */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.data-table th,
.data-table td {
  padding: 0.4rem 0.6rem;
  text-align: left;
  border-bottom: 1px solid #222;
}

.data-table th {
  color: #00aa00;
  font-weight: bold;
  background: #111;
}

.data-table tr:hover {
  background: #1a1a1a;
}

/* Compact card for queries with params */
.query-with-params {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px dashed #333;
}

.query-with-params .form-field {
  flex: 1;
  margin-bottom: 0;
}

.query-with-params .btn {
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
}

/* Links */
.link-card {
  display: block;
  background: #0f0f0f;
  border: 1px solid #333;
  padding: 1rem;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
}

.link-card:hover {
  border-color: #00ffff;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
}

.link-card .card-title {
  color: #00ffff;
}

.link-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

/* Embed */
.embed-container {
  border: 1px solid #333;
  background: #000;
  margin-top: 1rem;
}

.embed-container iframe {
  width: 100%;
  height: 600px;
  border: none;
}

/* Loading */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #888;
}

.loading::after {
  content: '';
  width: 20px;
  height: 20px;
  border: 2px solid #333;
  border-top-color: #00ff00;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-left: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Refresh button */
.refresh-btn {
  background: transparent;
  border: 1px solid #333;
  color: #888;
  padding: 0.25rem 0.5rem;
  font-family: 'Courier New', monospace;
  cursor: pointer;
}

.refresh-btn:hover {
  border-color: #00ff00;
  color: #00ff00;
}

/* Server controls in header */
.server-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.server-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: #1a1a1a;
  border: 1px solid #333;
  color: #888;
  padding: 0.3rem 0.6rem;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.server-btn:hover:not(.disabled) {
  border-color: #00ff00;
  color: #00ff00;
}

.server-btn.running {
  border-color: #00aa00;
  color: #00ff00;
}

.server-btn.stopped {
  border-color: #aa0000;
  color: #ff6666;
}

.server-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auto-refresh-indicator {
  font-size: 0.7rem;
  color: #666;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.auto-refresh-indicator.active {
  color: #00aa00;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  background: #00ff00;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

/* Toast notifications */
.toast-container {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 1000;
}

.toast {
  background: #1a1a1a;
  border: 1px solid #333;
  padding: 1rem;
  margin-top: 0.5rem;
  animation: slideIn 0.3s ease;
}

.toast.success { border-color: #00ff00; }
.toast.error { border-color: #ff0000; }

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
`;

// ============================================================================
// JavaScript
// ============================================================================

const SCRIPT = `
const BASE_URL = window.location.origin;
let activeTab = null;
const REFRESH_INTERVAL = 5000; // Refresh live data every 5 seconds
const liveDataRefreshTimers = new Map();

// Tab switching
function switchTab(tabId) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabId);
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(c => {
    c.classList.toggle('active', c.id === 'tab-' + tabId);
  });

  activeTab = tabId;
  window.location.hash = tabId;

  // Refresh live data for this tab
  refreshTabData(tabId);
}

// Fetch and display live data for a query
async function fetchLiveData(queryId, container, params = {}) {
  const refreshBtn = container.querySelector('.live-data-refresh');
  const dataDiv = container.querySelector('.live-data');
  const timestampDiv = container.querySelector('.live-data-timestamp');

  try {
    if (refreshBtn) refreshBtn.classList.add('spinning');
    dataDiv.className = 'live-data loading';
    dataDiv.innerHTML = 'Loading...';

    // Build query params - MUST include format=json for proper API responses
    const urlParams = new URLSearchParams();
    urlParams.append('format', 'json');
    for (const [key, value] of Object.entries(params)) {
      if (value) urlParams.append(key, value);
    }

    const url = BASE_URL + '/admin/queries/' + queryId + '?' + urlParams.toString();
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok) {
      dataDiv.className = 'live-data success';
      dataDiv.innerHTML = formatQueryData(queryId, data);
      if (timestampDiv) {
        timestampDiv.textContent = 'Updated: ' + new Date().toLocaleTimeString();
      }
    } else {
      throw new Error(data.error || 'Query failed');
    }
  } catch (error) {
    dataDiv.className = 'live-data error';
    dataDiv.innerHTML = '<pre>Error: ' + error.message + '</pre>';
  } finally {
    if (refreshBtn) refreshBtn.classList.remove('spinning');
  }
}

// Format query data based on query type
function formatQueryData(queryId, data) {
  // Handle errors
  if (data.error) {
    return '<pre class="error">' + data.error + '</pre>';
  }

  // Custom formatters for known query types
  switch (queryId) {
    case 'get-roadmap':
      return formatRoadmap(data);
    case 'list-sessions':
    case 'list-universes':
      return formatSessions(data);
    case 'list-agents':
      return formatAgents(data);
    case 'queue-status':
      return formatSpriteQueue(data);
    case 'list-sprites':
      return formatSpriteList(data);
    case 'list-souls':
      return formatSouls(data);
    case 'list-recordings':
      return formatRecordings(data);
    case 'list-saves':
      return formatSaves(data);
    case 'llm-queue-status':
      return formatLLMQueue(data);
    case 'game-server-status':
      return formatGameServerStatus(data);
    case 'providers':
      return formatLLMProviders(data);
    case 'queue-stats':
      return formatLLMQueueStats(data);
    case 'session-cooldowns':
      return formatSessionCooldowns(data);
    case 'list-work-orders':
      return formatWorkOrders(data);
    case 'pipeline-status':
      return formatPipelineStatus(data);
    default:
      // Default: pretty-print JSON
      return '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
  }
}

// Roadmap formatter
function formatRoadmap(data) {
  if (!data.phases || data.phases.length === 0) {
    return '<div style="color: #888;">No phases found</div>';
  }

  let html = '<div style="margin-bottom: 1rem;">';
  html += '<strong>Progress:</strong> ' + (data.overallProgress || 0) + '% ';
  html += '(' + (data.doneTasks || 0) + '/' + (data.totalTasks || 0) + ' tasks)';
  html += '</div>';

  for (const phase of data.phases) {
    const statusIcon = phase.status === 'completed' ? '✅' : phase.status === 'in-progress' ? '🚧' : '⏳';
    html += '<div style="margin-bottom: 0.5rem;">';
    html += '<strong>' + statusIcon + ' ' + phase.name + '</strong>';
    html += ' <span style="color: #888;">[' + phase.progress + '%]</span>';
    html += '</div>';

    if (phase.tasks && phase.tasks.length > 0) {
      html += '<ul style="margin-left: 1.5rem; margin-bottom: 0.5rem;">';
      for (const task of phase.tasks) {
        const taskIcon = task.status === 'done' ? '✓' : '○';
        const taskStyle = task.status === 'done' ? 'color: #00aa00;' : 'color: #888;';
        html += '<li style="' + taskStyle + '">' + taskIcon + ' ' + task.name + '</li>';
      }
      html += '</ul>';
    }
  }

  return html;
}

// Sessions/Universes formatter
function formatSessions(data) {
  const sessions = data.sessions || data.universes || [];
  if (sessions.length === 0) {
    return '<div style="color: #888;">No active sessions</div>';
  }

  let html = '<table class="data-table"><thead><tr>';
  html += '<th>Session</th><th>Agents</th><th>Day</th><th>Status</th>';
  html += '</tr></thead><tbody>';

  for (const s of sessions) {
    html += '<tr>';
    html += '<td>' + (s.sessionId || s.id || 'unknown').substring(0, 8) + '</td>';
    html += '<td>' + (s.agentCount || s.agents || 0) + '</td>';
    html += '<td>' + (s.day || s.currentDay || '?') + '</td>';
    html += '<td>' + (s.status || 'running') + '</td>';
    html += '</tr>';
  }

  html += '</tbody></table>';
  return html;
}

// Agents formatter
function formatAgents(data) {
  const agents = data.agents || [];
  if (agents.length === 0) {
    return '<div style="color: #888;">No agents found</div>';
  }

  let html = '<div style="margin-bottom: 0.5rem;"><strong>' + agents.length + '</strong> agents</div>';
  html += '<table class="data-table"><thead><tr>';
  html += '<th>Name</th><th>State</th><th>Position</th>';
  html += '</tr></thead><tbody>';

  for (const a of agents.slice(0, 20)) {
    html += '<tr>';
    html += '<td>' + (a.name || a.id?.substring(0, 8) || 'unknown') + '</td>';
    html += '<td>' + (a.state || a.behavior || '?') + '</td>';
    html += '<td>' + (a.position ? a.position.x + ',' + a.position.y : '?') + '</td>';
    html += '</tr>';
  }

  if (agents.length > 20) {
    html += '<tr><td colspan="3" style="color: #888;">... and ' + (agents.length - 20) + ' more</td></tr>';
  }

  html += '</tbody></table>';
  return html;
}

// Sprite queue formatter
function formatSpriteQueue(data) {
  const summary = data.summary || {};
  const pending = data.pending?.sprites || [];

  let html = '<div style="display: flex; gap: 2rem; margin-bottom: 1rem;">';
  html += '<div><strong>Pending:</strong> ' + (summary.sprites?.pending || pending.length || 0) + '</div>';
  html += '<div><strong>Completed:</strong> ' + (summary.sprites?.completed || 0) + '</div>';
  html += '</div>';

  if (pending.length > 0) {
    html += '<div style="font-size: 0.85rem;">';
    for (const sprite of pending.slice(0, 5)) {
      const status = sprite.status === 'generating' ? '⚡' : '📋';
      html += '<div>' + status + ' ' + (sprite.folderId || sprite.id) + '</div>';
    }
    if (pending.length > 5) {
      html += '<div style="color: #888;">... and ' + (pending.length - 5) + ' more</div>';
    }
    html += '</div>';
  }

  return html;
}

// Sprite list formatter (for list-sprites query)
function formatSpriteList(data) {
  const total = data.total || 0;
  const sprites = data.sprites || [];

  if (total === 0 && sprites.length === 0) {
    return '<div style="color: #888;">No sprites found</div>';
  }

  // Count by category
  const categories = {};
  const withImages = sprites.filter((s) => s.hasImage).length;

  for (const sprite of sprites) {
    const cat = sprite.category || 'unknown';
    categories[cat] = (categories[cat] || 0) + 1;
  }

  let html = '<div style="display: flex; gap: 2rem; flex-wrap: wrap; margin-bottom: 0.5rem;">';
  html += '<div><strong>Total:</strong> ' + total + '</div>';
  html += '<div><strong>With Images:</strong> ' + withImages + '</div>';
  html += '</div>';

  // Show top categories
  const topCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (topCategories.length > 0) {
    html += '<div style="font-size: 0.85rem; color: #888;">';
    html += topCategories.map(([cat, count]) => cat + ': ' + count).join(' | ');
    html += '</div>';
  }

  return html;
}

// Souls formatter
function formatSouls(data) {
  const souls = data.souls || [];
  const total = data.total || souls.length;

  if (souls.length === 0) {
    return '<div style="color: #888;">No souls found</div>';
  }

  let html = '<div style="margin-bottom: 0.5rem;"><strong>' + total + '</strong> souls</div>';
  return html + '<div style="color: #888; font-size: 0.85rem;">View full gallery in Media tab</div>';
}

// Recordings formatter
function formatRecordings(data) {
  const recordings = data.recordings || [];
  if (recordings.length === 0) {
    return '<div style="color: #888;">No recordings found</div>';
  }

  return '<div><strong>' + recordings.length + '</strong> recordings available</div>';
}

// Saves formatter
function formatSaves(data) {
  const saves = data.saves || [];
  if (saves.length === 0) {
    return '<div style="color: #888;">No saves found</div>';
  }

  let html = '<table class="data-table"><thead><tr>';
  html += '<th>Name</th><th>Day</th><th>Agents</th><th>Date</th>';
  html += '</tr></thead><tbody>';

  for (const s of saves.slice(0, 10)) {
    html += '<tr>';
    html += '<td>' + (s.name || s.id || '?') + '</td>';
    html += '<td>' + (s.day || '?') + '</td>';
    html += '<td>' + (s.agentCount || '?') + '</td>';
    html += '<td>' + (s.timestamp ? new Date(s.timestamp).toLocaleDateString() : '?') + '</td>';
    html += '</tr>';
  }

  html += '</tbody></table>';
  return html;
}

// LLM Queue formatter
function formatLLMQueue(data) {
  let html = '<div style="display: flex; gap: 2rem; flex-wrap: wrap;">';
  html += '<div><strong>Pending:</strong> ' + (data.pending || 0) + '</div>';
  html += '<div><strong>Processing:</strong> ' + (data.processing || 0) + '</div>';
  html += '<div><strong>Completed:</strong> ' + (data.completed || 0) + '</div>';
  html += '</div>';

  if (data.providers) {
    html += '<div style="margin-top: 0.5rem; font-size: 0.85rem;">';
    for (const [name, info] of Object.entries(data.providers)) {
      const status = info.available ? '🟢' : '🔴';
      html += '<div>' + status + ' ' + name + '</div>';
    }
    html += '</div>';
  }

  return html;
}

// Game server status formatter
function formatGameServerStatus(data) {
  if (data.running) {
    return '<div>🟢 <strong>Running</strong> at <a href="' + data.url + '" target="_blank">' + data.url + '</a></div>';
  } else {
    return '<div>🔴 <strong>Not running</strong><br><span style="color: #888; font-size: 0.85rem;">' + (data.message || 'Start with action below') + '</span></div>';
  }
}

// LLM Providers formatter
function formatLLMProviders(data) {
  if (data.error) {
    return '<pre class="error">' + data.error + '</pre>';
  }

  let html = '<div style="display: flex; gap: 2rem; margin-bottom: 1rem;">';
  html += '<div><strong>Total Providers:</strong> ' + (data.summary?.totalProviders || 0) + '</div>';
  html += '<div><strong>Total Requests:</strong> ' + (data.summary?.totalRequests || 0) + '</div>';
  html += '</div>';

  if (data.queues) {
    html += '<table class="data-table"><thead><tr>';
    html += '<th>Provider</th><th>Queue</th><th>Rate Limited</th><th>Wait Time</th><th>Utilization</th>';
    html += '</tr></thead><tbody>';

    for (const [provider, queueData] of Object.entries(data.queues)) {
      const rateLimited = queueData.rateLimited ? '🔴 YES' : '🟢 NO';
      const utilization = ((queueData.semaphoreUtilization || 0) * 100).toFixed(1) + '%';

      html += '<tr>';
      html += '<td><strong>' + provider.toUpperCase() + '</strong></td>';
      html += '<td>' + (queueData.queueLength || 0) + '</td>';
      html += '<td>' + rateLimited + '</td>';
      html += '<td>' + (queueData.rateLimitWaitMs || 0) + 'ms</td>';
      html += '<td>' + utilization + '</td>';
      html += '</tr>';
    }

    html += '</tbody></table>';
  }

  return html;
}

// LLM Queue Stats formatter
function formatLLMQueueStats(data) {
  if (data.error) {
    return '<pre class="error">' + data.error + '</pre>';
  }

  let html = '';

  // Provider summary
  if (data.providers && data.providers.length > 0) {
    html += '<div style="margin-bottom: 1rem;"><strong>Providers:</strong> ' + data.providers.join(', ') + '</div>';
  }

  // Session stats
  if (data.sessions) {
    html += '<div style="display: flex; gap: 2rem; margin-bottom: 1rem; flex-wrap: wrap;">';
    html += '<div><strong>Total Sessions:</strong> ' + (data.sessions.totalSessions || 0) + '</div>';
    html += '<div><strong>Avg Requests/Session:</strong> ' + (data.sessions.averageRequestsPerSession || 0) + '</div>';
    html += '<div><strong>Oldest Session:</strong> ' + Math.floor((data.sessions.oldestSessionAge || 0) / 1000) + 's</div>';
    html += '</div>';
  }

  // Metrics summary
  if (data.metrics) {
    const last5 = data.metrics.last5Minutes || {};
    html += '<div style="margin-top: 1rem;">';
    html += '<div style="font-size: 0.9rem; color: #00aa00; margin-bottom: 0.5rem;"><strong>Last 5 Minutes</strong></div>';
    html += '<div style="display: flex; gap: 2rem; flex-wrap: wrap; font-size: 0.85rem;">';
    html += '<div>Requests: ' + (last5.totalRequests || 0) + '</div>';
    html += '<div>Success: ' + (last5.successfulRequests || 0) + '</div>';
    html += '<div>Failed: ' + (last5.failedRequests || 0) + '</div>';
    html += '<div>Avg Wait: ' + (last5.avgWaitMs || 0) + 'ms</div>';
    html += '<div>Requests/Min: ' + (last5.requestsPerMinute || 0).toFixed(1) + '</div>';
    html += '</div>';
    html += '</div>';
  }

  return html;
}

// Session Cooldowns formatter
function formatSessionCooldowns(data) {
  if (data.error) {
    return '<pre class="error">' + data.error + '</pre>';
  }

  let html = '';

  if (data.sessions) {
    html += '<div style="display: flex; gap: 2rem; margin-bottom: 1rem;">';
    html += '<div><strong>Total Sessions:</strong> ' + (data.sessions.totalSessions || 0) + '</div>';
    html += '<div><strong>Avg Requests/Session:</strong> ' + (data.sessions.averageRequestsPerSession || 0) + '</div>';
    html += '</div>';
  }

  if (data.cooldowns) {
    html += '<div style="color: #888; font-size: 0.85rem; margin-top: 0.5rem;">' + data.cooldowns + '</div>';
  }

  return html;
}

// Work Orders formatter
function formatWorkOrders(data) {
  if (data.error) {
    return '<pre class="error">' + data.error + '</pre>';
  }

  const workOrders = data.workOrders || [];
  const count = data.count || workOrders.length;

  if (workOrders.length === 0) {
    return '<div style="color: #888;">No work orders found</div>';
  }

  let html = '<div style="margin-bottom: 1rem;"><strong>' + count + '</strong> work orders available</div>';

  // Display as a grid of clickable cards
  html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.5rem; max-height: 300px; overflow-y: auto;">';

  for (const wo of workOrders) {
    html += '<div class="work-order-card" style="background: #1a1a1a; border: 1px solid #333; padding: 0.5rem; font-size: 0.85rem; cursor: pointer;" ';
    html += 'data-work-order="' + wo + '" ';
    html += 'title="Click to select for pipeline">';
    html += wo;
    html += '</div>';
  }

  html += '</div>';
  html += '<div style="margin-top: 0.5rem; color: #888; font-size: 0.75rem;">💡 Click a work order to auto-fill it in "Start Claude Code Pipeline" below</div>';

  return html;
}

// Pipeline Status formatter
function formatPipelineStatus(data) {
  if (data.error) {
    return '<pre class="error">' + data.error + '</pre>';
  }

  const status = data.status || 'unknown';
  const workOrder = data.workOrder;
  const timestamp = data.timestamp;

  let html = '<div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">';

  if (status === 'running') {
    html += '<div style="font-size: 2rem;">🚀</div>';
    html += '<div>';
    html += '<div style="font-size: 1.2rem; color: #00ff00;"><strong>RUNNING</strong></div>';
    if (workOrder) {
      html += '<div style="color: #888; font-size: 0.85rem;">Work Order: <span style="color: #00ff00;">' + workOrder + '</span></div>';
    }
    if (timestamp) {
      const elapsed = Math.floor((Date.now() - timestamp) / 1000);
      html += '<div style="color: #888; font-size: 0.75rem;">Running for: ' + elapsed + 's</div>';
    }
    html += '</div>';
  } else if (status === 'stopping') {
    html += '<div style="font-size: 2rem;">⏸️</div>';
    html += '<div>';
    html += '<div style="font-size: 1.2rem; color: #ffaa00;"><strong>STOPPING</strong></div>';
    html += '<div style="color: #888; font-size: 0.85rem;">Pipeline shutting down...</div>';
    html += '</div>';
  } else {
    html += '<div style="font-size: 2rem;">💤</div>';
    html += '<div>';
    html += '<div style="font-size: 1.2rem; color: #888;"><strong>IDLE</strong></div>';
    html += '<div style="color: #888; font-size: 0.85rem;">No pipeline currently running</div>';
    if (workOrder) {
      html += '<div style="color: #666; font-size: 0.75rem;">Last run: ' + workOrder + '</div>';
    }
    html += '</div>';
  }

  html += '</div>';

  return html;
}

// Refresh all live data in a tab
function refreshTabData(tabId) {
  const tabContent = document.getElementById('tab-' + tabId);
  if (!tabContent) return;

  const liveContainers = tabContent.querySelectorAll('[data-query-id]');
  liveContainers.forEach(container => {
    const queryId = container.dataset.queryId;
    const hasRequiredParams = container.dataset.hasRequired === 'true';

    if (!hasRequiredParams) {
      fetchLiveData(queryId, container);
    }
  });
}

// Form submission for queries with params
async function submitQueryWithParams(queryId, form) {
  const container = form.closest('[data-query-id]');

  // Build params from form
  const formData = new FormData(form);
  const params = {};
  for (const [key, value] of formData) {
    if (value) params[key] = value;
  }

  await fetchLiveData(queryId, container, params);
}

// Form submission for actions
async function submitAction(actionId, form) {
  const resultDiv = form.closest('.card').querySelector('.result');
  const submitBtn = form.querySelector('button[type="submit"]');

  // Check for dangerous actions
  if (form.dataset.dangerous === 'true') {
    if (!confirm('This is a dangerous action. Are you sure?')) {
      return;
    }
  }

  try {
    submitBtn.disabled = true;
    resultDiv.className = 'result active';
    resultDiv.innerHTML = '<div class="loading">Executing...</div>';

    // Build JSON body
    const formData = new FormData(form);
    const body = {};
    for (const [key, value] of formData) {
      if (value !== '') {
        // Try to parse as JSON/number/boolean
        try {
          body[key] = JSON.parse(value);
        } catch {
          body[key] = value;
        }
      }
    }

    const response = await fetch(BASE_URL + '/admin/actions/' + actionId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();

    if (data.success) {
      resultDiv.className = 'result active success';
      resultDiv.innerHTML = '<pre>✓ ' + (data.message || 'Success') + '</pre>';
      if (data.data) {
        resultDiv.innerHTML += '<pre>' + JSON.stringify(data.data, null, 2) + '</pre>';
      }
      showToast('Action completed successfully', 'success');

      // Refresh all live data after action
      setTimeout(() => refreshTabData(activeTab), 500);
    } else {
      throw new Error(data.error || 'Action failed');
    }
  } catch (error) {
    resultDiv.className = 'result active error';
    resultDiv.innerHTML = '<pre>✗ Error: ' + error.message + '</pre>';
    showToast('Action failed: ' + error.message, 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

// Toast notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 5000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Handle initial hash
  const hash = window.location.hash.slice(1);
  if (hash) {
    switchTab(hash);
  } else {
    // Default to first tab
    const firstTab = document.querySelector('.tab');
    if (firstTab) switchTab(firstTab.dataset.tab);
  }

  // Tab click handlers
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Query form submit handlers (for queries with params)
  document.querySelectorAll('form[data-query-form]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitQueryWithParams(form.dataset.queryForm, form);
    });
  });

  // Action form submit handlers
  document.querySelectorAll('form[data-action]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitAction(form.dataset.action, form);
    });
  });

  // Refresh button handlers
  document.querySelectorAll('.live-data-refresh').forEach(btn => {
    btn.addEventListener('click', () => {
      const container = btn.closest('[data-query-id]');
      if (container) {
        fetchLiveData(container.dataset.queryId, container);
      }
    });
  });

  // Global refresh button
  document.querySelectorAll('.refresh-btn').forEach(btn => {
    btn.addEventListener('click', () => refreshTabData(activeTab));
  });

  // Work order click-to-select handler (event delegation)
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('work-order-card')) {
      const workOrderName = target.dataset.workOrder;
      if (workOrderName) {
        // Find the action input (not the query input)
        const inputs = Array.from(document.querySelectorAll('input[name="workOrder"]'));
        const actionInput = inputs.find(i => i.placeholder && i.placeholder.includes('from work orders'));
        if (actionInput) {
          actionInput.value = workOrderName;
        }
      }
    }
  });

  // Set up periodic refresh
  setInterval(() => {
    if (activeTab) {
      refreshTabData(activeTab);
    }
  }, REFRESH_INTERVAL);
});

// WebSocket for real-time updates (optional)
function connectWebSocket() {
  const wsUrl = 'ws://' + window.location.hostname + ':8765';
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('[Admin] WebSocket connected');
    document.querySelector('.status-dot').classList.remove('disconnected');
    document.querySelector('.status-dot').classList.add('connected');
  };

  ws.onclose = () => {
    console.log('[Admin] WebSocket disconnected');
    document.querySelector('.status-dot').classList.remove('connected');
    document.querySelector('.status-dot').classList.add('disconnected');
    // Reconnect after 5s
    setTimeout(connectWebSocket, 5000);
  };

  ws.onerror = (err) => {
    console.error('[Admin] WebSocket error:', err);
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleWebSocketMessage(msg);
    } catch (e) {
      // Ignore non-JSON messages
    }
  };
}

function handleWebSocketMessage(msg) {
  // Handle different message types for real-time updates
  console.log('[Admin] WS message:', msg.type);
  // Refresh relevant data based on message type
  if (msg.type === 'agent-update' || msg.type === 'session-update') {
    refreshTabData(activeTab);
  }
}

// Poll game connection status every 5 seconds
async function checkGameStatus() {
  try {
    const response = await fetch('/api/live/status');
    const data = await response.json();

    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-indicator span');

    if (data.connected) {
      statusDot.classList.remove('disconnected');
      statusDot.classList.add('connected');
      statusText.textContent = 'Game Connected (' + (data.activeClients || 1) + ' client' + (data.activeClients > 1 ? 's' : '') + ')';
    } else {
      statusDot.classList.remove('connected');
      statusDot.classList.add('disconnected');
      statusText.textContent = 'No Game Connected';
    }
  } catch (err) {
    console.error('[Admin] Failed to check game status:', err);
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-indicator span');
    statusDot.classList.remove('connected');
    statusDot.classList.add('disconnected');
    statusText.textContent = 'Status Unknown';
  }
}

// Check status on page load and every 5 seconds
checkGameStatus();
setInterval(checkGameStatus, 5000);

// ============================================================================
// Game Server Controls
// ============================================================================

let gameServerRunning = false;

async function checkGameServerStatus() {
  try {
    const response = await fetch('/api/game-server/status');
    const data = await response.json();

    gameServerRunning = data.running;
    const btn = document.getElementById('game-server-btn');
    const icon = document.getElementById('game-server-status');

    if (btn && icon) {
      if (data.running) {
        btn.className = 'server-btn running';
        icon.textContent = '🟢';
        btn.title = 'Game server running on port ' + (data.port || 3000) + '. Click to stop.';
      } else {
        btn.className = 'server-btn stopped';
        icon.textContent = '🔴';
        btn.title = 'Game server not running. Click to start.';
      }
    }
  } catch (err) {
    console.error('[Admin] Failed to check game server status:', err);
    const btn = document.getElementById('game-server-btn');
    const icon = document.getElementById('game-server-status');
    if (btn && icon) {
      btn.className = 'server-btn disabled';
      icon.textContent = '❓';
    }
  }
}

async function toggleGameServer() {
  const btn = document.getElementById('game-server-btn');
  const icon = document.getElementById('game-server-status');

  try {
    btn.classList.add('disabled');
    icon.textContent = '⏳';

    if (gameServerRunning) {
      // Stop server
      const response = await fetch('/api/game-server/stop', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        showToast('Game server stopped', 'success');
      } else {
        throw new Error(data.error || 'Failed to stop');
      }
    } else {
      // Start server
      const response = await fetch('/api/game-server/start', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        showToast('Game server starting... Visit ' + (data.url || 'http://localhost:3000'), 'success');
      } else {
        throw new Error(data.error || 'Failed to start');
      }
    }

    // Wait a bit then check status
    setTimeout(checkGameServerStatus, 2000);

  } catch (err) {
    showToast('Error: ' + err.message, 'error');
    btn.classList.remove('disabled');
    checkGameServerStatus();
  }
}

// ============================================================================
// PixelLab Daemon Status
// ============================================================================

let pixelLabRunning = false;

async function checkPixelLabStatus() {
  try {
    const response = await fetch('/api/pixellab/daemon-status');
    const data = await response.json();
    pixelLabRunning = data.running;

    const btn = document.getElementById('pixellab-status');
    const icon = document.getElementById('pixellab-icon');

    if (btn && icon) {
      if (data.running) {
        btn.className = 'server-btn running';
        icon.textContent = '🟢';
        btn.title = 'PixelLab daemon running. ' + (data.pending || 0) + ' pending jobs. Click to stop.';
      } else {
        btn.className = 'server-btn stopped';
        icon.textContent = '🔴';
        btn.title = 'PixelLab daemon stopped. Click to start.';
      }
    }
  } catch (err) {
    // PixelLab status endpoint might not exist
    const btn = document.getElementById('pixellab-status');
    const icon = document.getElementById('pixellab-icon');
    if (btn && icon) {
      btn.className = 'server-btn disabled';
      icon.textContent = '❓';
    }
  }
}

async function togglePixelLabDaemon() {
  const btn = document.getElementById('pixellab-status');
  const icon = document.getElementById('pixellab-icon');

  if (!btn || !icon) return;

  // Show loading state
  btn.className = 'server-btn disabled';
  icon.textContent = '⏳';

  try {
    const endpoint = pixelLabRunning ? '/api/pixellab/daemon/stop' : '/api/pixellab/daemon/start';
    const response = await fetch(endpoint, { method: 'POST' });
    const data = await response.json();

    if (data.success) {
      showToast(data.message || (pixelLabRunning ? 'Daemon stopped' : 'Daemon started'), 'success');
    } else {
      showToast(data.error || 'Failed to toggle daemon', 'error');
    }

    // Refresh status
    setTimeout(checkPixelLabStatus, 500);
  } catch (err) {
    showToast('Failed to toggle PixelLab daemon', 'error');
    checkPixelLabStatus();
  }
}

// ============================================================================
// Refresh All
// ============================================================================

function refreshAll() {
  // Refresh all live data in current tab
  refreshTabData(activeTab);

  // Also refresh server statuses
  checkGameStatus();
  checkGameServerStatus();
  checkPixelLabStatus();

  showToast('Refreshing...', 'info');
}

// ============================================================================
// Auto-refresh initialization
// ============================================================================

// Check server statuses on page load
checkGameServerStatus();
checkPixelLabStatus();

// Poll server statuses every 10 seconds
setInterval(() => {
  checkGameServerStatus();
  checkPixelLabStatus();
}, 10000);

// Optional: Connect WebSocket for real-time updates
// connectWebSocket();
`;

// ============================================================================
// Render Functions
// ============================================================================

/**
 * Render the full HTML dashboard
 */
export function renderDashboardHtml(context: ViewContext): string {
  const { baseUrl, sessionId } = context;
  const gameConnected = context.gameClient !== null;
  const tabs = capabilityRegistry.getTabs();

  let tabButtons = '';
  let tabContents = '';

  for (const cap of tabs) {
    tabButtons += `
      <div class="tab" data-tab="${cap.id}">
        <span class="tab-icon">${cap.tab?.icon || '📄'}</span>
        <span>${cap.name}</span>
      </div>`;

    tabContents += renderCapabilityHtml(cap, context);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Multiverse: The End of Eternity - Admin Console</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="container">
    <header>
      <h1>⚡ AI VILLAGE ADMIN CONSOLE</h1>
      <div class="status">
        <div class="status-indicator">
          <div class="status-dot ${gameConnected ? 'connected' : 'disconnected'}"></div>
          <span>${gameConnected ? 'Game Connected' : 'No Game'}</span>
        </div>
        ${sessionId ? `<span>Session: ${sessionId}</span>` : ''}
        <div class="server-controls">
          <button id="game-server-btn" class="server-btn" onclick="toggleGameServer()" title="Click to start/stop game server">
            <span id="game-server-status">⏳</span> Game
          </button>
          <button id="pixellab-status" class="server-btn disabled" onclick="togglePixelLabDaemon()" title="Click to start/stop PixelLab daemon">
            <span id="pixellab-icon">⏳</span> PixelLab
          </button>
        </div>
        <div class="auto-refresh-indicator active">
          <span class="pulse-dot"></span>
          <span>Live</span>
        </div>
        <button class="refresh-btn" onclick="refreshAll()" title="Refresh all data now">↻</button>
      </div>
    </header>

    <div class="tabs">
      ${tabButtons}
    </div>

    ${tabContents}
  </div>

  <div class="toast-container" id="toast-container"></div>

  <script>${SCRIPT}</script>
</body>
</html>`;
}

/**
 * Render a capability as an HTML tab content
 */
function renderCapabilityHtml(capability: AdminCapability, context: ViewContext): string {
  const { baseUrl } = context;

  let queriesHtml = '';
  let actionsHtml = '';
  let linksHtml = '';

  // Render queries as live data displays
  if (capability.queries && capability.queries.length > 0) {
    const queryCards = capability.queries.map(q => renderQueryCard(q, context)).filter(c => c).join('');
    // Only show section if there are visible queries
    if (queryCards.trim()) {
      queriesHtml = `
        <div class="section">
          <h3 class="section-header">📊 Live Data</h3>
          <div class="card-grid">
            ${queryCards}
          </div>
        </div>`;
    }
  }

  // Render actions
  if (capability.actions && capability.actions.length > 0) {
    actionsHtml = `
      <div class="section">
        <h3 class="section-header">⚡ Actions</h3>
        <div class="card-grid">
          ${capability.actions.map(a => renderActionCard(a, context)).join('')}
        </div>
      </div>`;
  }

  // Render links
  if (capability.links && capability.links.length > 0) {
    linksHtml = `
      <div class="section">
        <h3 class="section-header">🔗 Links</h3>
        <div class="card-grid">
          ${capability.links.map(l => renderLinkCard(l, context)).join('')}
        </div>
      </div>`;
  }

  return `
    <div class="tab-content" id="tab-${capability.id}">
      <div class="tab-header">
        <h2>${capability.tab?.icon || '📄'} ${capability.name}</h2>
        <p>${capability.description}</p>
      </div>
      ${queriesHtml}
      ${actionsHtml}
      ${linksHtml}
    </div>`;
}

/**
 * Render a query as a live data card (auto-fetching display)
 * - Queries without required params: Show live data that auto-updates
 * - Queries with required params: Show compact form + data area
 * - Skip queries that are "raw" or internal (for LLM use only)
 */
function renderQueryCard(query: AdminQuery, context: ViewContext): string {
  // Skip internal/raw queries from HTML view (these are for LLM/API use)
  const internalQueries = ['get-roadmap-raw', 'get-soul', 'get-recording', 'get-universe'];
  if (internalQueries.includes(query.id)) {
    return ''; // Don't render in HTML view
  }

  // Check if query has required params
  const requiredParams = query.params.filter(p => p.required);
  const hasRequiredParams = requiredParams.length > 0;

  if (hasRequiredParams) {
    // Render with compact form for required params
    const formFields = query.params.map(p => renderFormField(p)).join('');

    return `
      <div class="card" data-query-id="${query.id}" data-has-required="true">
        <div class="card-header">
          <span class="card-title">${query.name}</span>
        </div>
        <div class="card-description">${query.description}</div>
        <form class="query-with-params" data-query-form="${query.id}">
          <div class="form-grid" style="flex: 1;">
            ${formFields}
          </div>
          <button type="submit" class="btn">Fetch</button>
        </form>
        <div class="live-data" style="margin-top: 0.5rem;">
          <span style="color: #888;">Enter parameters and click Fetch</span>
        </div>
      </div>`;
  }

  // Render as auto-updating live data display
  return `
    <div class="card" data-query-id="${query.id}" data-has-required="false">
      <div class="live-data-header">
        <span class="card-title">${query.name}</span>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="live-data-timestamp"></span>
          <button class="live-data-refresh" title="Refresh">↻</button>
        </div>
      </div>
      <div class="live-data loading">Loading...</div>
    </div>`;
}

/**
 * Render an action as an HTML card with form
 */
function renderActionCard(action: AdminAction, context: ViewContext): string {
  const formFields = action.params.map(p => renderFormField(p)).join('');
  const dangerClass = action.dangerous ? 'danger' : '';
  const badge = action.dangerous ? '<span class="card-badge">⚠️ DANGEROUS</span>' : '';

  return `
    <div class="card">
      <div class="card-header">
        <span class="card-title">${action.name}</span>
        ${badge}
      </div>
      <div class="card-description">${action.description}</div>
      <form data-action="${action.id}" data-dangerous="${action.dangerous || false}">
        <div class="form-grid">
          ${formFields}
        </div>
        <button type="submit" class="btn ${dangerClass}">Execute</button>
      </form>
      <div class="result"></div>
    </div>`;
}

/**
 * Render a link as an HTML card (or embedded iframe if embeddable)
 */
function renderLinkCard(link: { id: string; name: string; description: string; url: string; icon?: string; embeddable?: boolean }, context: ViewContext): string {
  const url = link.url.replace('{session}', context.sessionId || 'latest');
  const icon = link.icon || '🔗';

  // If embeddable, render as an iframe
  if (link.embeddable) {
    return `
      <div class="card" style="grid-column: span 2;">
        <div class="card-header">
          <span class="card-title">${icon} ${link.name}</span>
          <a href="${url}" target="_blank" class="btn" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">↗ Open</a>
        </div>
        <div class="card-description">${link.description}</div>
        <div class="embed-container">
          <iframe src="${url}" loading="lazy"></iframe>
        </div>
      </div>`;
  }

  // Regular link card
  return `
    <a href="${url}" target="_blank" class="link-card">
      <div class="link-icon">${icon}</div>
      <div class="card-title">${link.name}</div>
      <div class="card-description">${link.description}</div>
    </a>`;
}

/**
 * Render a form field for a parameter
 */
function renderFormField(param: AdminParam): string {
  const required = param.required ? 'required' : '';
  const requiredClass = param.required ? 'required' : '';
  const defaultValue = param.default !== undefined ? String(param.default) : '';

  let input = '';

  switch (param.type) {
    case 'boolean':
      input = `<input type="checkbox" name="${param.name}" ${param.default ? 'checked' : ''}>`;
      break;

    case 'select':
      const options = (param.options || [])
        .map(o => `<option value="${o.value}">${o.label}</option>`)
        .join('');
      input = `<select name="${param.name}" ${required}><option value="">-- Select --</option>${options}</select>`;
      break;

    case 'number':
      input = `<input type="number" name="${param.name}" value="${defaultValue}" ${required}>`;
      break;

    case 'json':
      input = `<textarea name="${param.name}" rows="3" placeholder="{}" ${required}>${defaultValue}</textarea>`;
      break;

    default:
      input = `<input type="text" name="${param.name}" value="${defaultValue}" placeholder="${param.description}" ${required}>`;
  }

  return `
    <div class="form-field">
      <label class="${requiredClass}">${param.name}</label>
      ${input}
    </div>`;
}

/**
 * Render error page as HTML
 */
export function renderErrorHtml(error: string, statusCode: number = 500): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Error ${statusCode}</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="container">
    <header>
      <h1>⚠️ Error ${statusCode}</h1>
    </header>
    <div class="tab-content active">
      <div class="result active error">
        <pre>${error}</pre>
      </div>
      <br>
      <a href="/admin" class="btn">← Back to Dashboard</a>
    </div>
  </div>
</body>
</html>`;
}
