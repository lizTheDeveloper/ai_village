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
}

// Form submission for queries
async function submitQuery(queryId, form) {
  const resultDiv = form.closest('.card').querySelector('.result');
  const submitBtn = form.querySelector('button[type="submit"]');

  try {
    submitBtn.disabled = true;
    resultDiv.className = 'result active';
    resultDiv.innerHTML = '<div class="loading">Loading...</div>';

    // Build query params
    const formData = new FormData(form);
    const params = new URLSearchParams();
    for (const [key, value] of formData) {
      if (value) params.append(key, value);
    }

    const url = BASE_URL + '/admin/queries/' + queryId + '?' + params.toString();
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok) {
      resultDiv.className = 'result active success';
      resultDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
    } else {
      throw new Error(data.error || 'Query failed');
    }
  } catch (error) {
    resultDiv.className = 'result active error';
    resultDiv.innerHTML = '<pre>Error: ' + error.message + '</pre>';
  } finally {
    submitBtn.disabled = false;
  }
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

  // Form submit handlers
  document.querySelectorAll('form[data-query]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitQuery(form.dataset.query, form);
    });
  });

  document.querySelectorAll('form[data-action]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitAction(form.dataset.action, form);
    });
  });

  // Refresh button handlers
  document.querySelectorAll('.refresh-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.reload();
    });
  });
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
}

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
  <title>AI Village - Admin Console</title>
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
        <button class="refresh-btn">↻ Refresh</button>
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

  // Render queries
  if (capability.queries && capability.queries.length > 0) {
    queriesHtml = `
      <div class="section">
        <h3 class="section-header">📖 Queries</h3>
        <div class="card-grid">
          ${capability.queries.map(q => renderQueryCard(q, context)).join('')}
        </div>
      </div>`;
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
 * Render a query as an HTML card with form
 */
function renderQueryCard(query: AdminQuery, context: ViewContext): string {
  const formFields = query.params.map(p => renderFormField(p)).join('');

  return `
    <div class="card">
      <div class="card-header">
        <span class="card-title">${query.name}</span>
      </div>
      <div class="card-description">${query.description}</div>
      <form data-query="${query.id}">
        <div class="form-grid">
          ${formFields}
        </div>
        <button type="submit" class="btn">Run Query</button>
      </form>
      <div class="result"></div>
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
 * Render a link as an HTML card
 */
function renderLinkCard(link: { id: string; name: string; description: string; url: string; icon?: string; embeddable?: boolean }, context: ViewContext): string {
  const url = link.url.replace('{session}', context.sessionId || 'latest');
  const icon = link.icon || '🔗';

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
