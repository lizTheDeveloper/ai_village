import { h, render, Component } from 'https://esm.sh/preact@10.25.4';
import { useState, useEffect, useCallback } from 'https://esm.sh/preact@10.25.4/hooks';
import htm from 'https://esm.sh/htm@3.1.1';

const html = htm.bind(h);

// BASE_PATH matches production.ts
const BASE_PATH = '/mvee';
const API_BASE = `${BASE_PATH}/admin/api`;

// ============================================================================
// Auth
// ============================================================================

function getMatrixToken() {
  return sessionStorage.getItem('mx_access_token');
}

function apiFetch(path) {
  const token = getMatrixToken();
  return fetch(`${API_BASE}${path}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  }).then(r => {
    if (r.status === 401 || r.status === 403) {
      showAuthGate('Session expired. Please sign in again.');
      throw new Error('Unauthorized');
    }
    return r.json();
  });
}

function showAuthGate(errorMsg) {
  const gate = document.getElementById('auth-gate');
  gate.classList.remove('hidden');
  if (errorMsg) {
    const errEl = document.getElementById('auth-error');
    errEl.textContent = errorMsg;
    errEl.style.display = 'block';
  }
}

function hideAuthGate() {
  document.getElementById('auth-gate').classList.add('hidden');
}

// ============================================================================
// Simple hash router
// ============================================================================

function getRoute() {
  const hash = location.hash.slice(1) || '/';
  return hash;
}

function navigate(path) {
  location.hash = path;
}

function useRoute() {
  const [route, setRoute] = useState(getRoute());
  useEffect(() => {
    const handler = () => setRoute(getRoute());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return route;
}

// ============================================================================
// Components
// ============================================================================

function Topbar({ title, showBack, userId }) {
  return html`
    <div class="topbar">
      ${showBack && html`<a class="back-link" href="#/" onclick=${(e) => { e.preventDefault(); navigate('/'); }}>← Species</a>`}
      <h1>${title}</h1>
      <span class="user-info">${userId || ''}</span>
    </div>
  `;
}

function SpeciesGrid() {
  const [species, setSpecies] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiFetch('/species').then(data => setSpecies(data.species)).catch(() => {});
  }, []);

  if (!species) return html`<div class="loading">Loading species...</div>`;

  const filtered = species.filter(s => {
    const q = search.toLowerCase();
    return !q || s.speciesName.toLowerCase().includes(q)
      || (s.commonName || '').toLowerCase().includes(q)
      || s.speciesId.toLowerCase().includes(q);
  });

  return html`
    <div class="container">
      <div class="toolbar">
        <input
          type="text"
          placeholder="Search species..."
          value=${search}
          onInput=${(e) => setSearch(e.target.value)}
        />
        <span class="count">${filtered.length} / ${species.length} species</span>
      </div>
      <div class="species-grid">
        ${filtered.map(s => html`
          <a class="species-card" key=${s.speciesId} href="#/species/${s.speciesId}" onclick=${(e) => { e.preventDefault(); navigate(`/species/${s.speciesId}`); }}>
            ${s.hasSprite
              ? html`<img src="${BASE_PATH}/assets/sprites/pixellab/${s.speciesId}/south.png" alt=${s.speciesName} loading="lazy"
                  onerror=${(e) => { e.target.style.display = 'none'; e.target.nextElementSibling && (e.target.nextElementSibling.style.display = 'inline-flex'); }} /><div class="no-sprite" style="display:none">No sprite</div>`
              : html`<div class="no-sprite">No sprite</div>`
            }
            <div class="name">${s.speciesName}</div>
            ${s.commonName && html`<div class="common">${s.commonName}</div>`}
            <div class="badges">
              ${s.sapient && html`<span class="badge sapient">Sapient</span>`}
              ${s.cross_game_compatible && html`<span class="badge xgame">Cross-game</span>`}
              <span class="badge">${s.sizeCategory || 'unknown'}</span>
            </div>
          </a>
        `)}
      </div>
    </div>
  `;
}

const TABS = ['Visual', 'Language', 'Songs', 'Wiki', 'Items', 'Factions'];

function SpeciesDetail({ speciesId }) {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('Visual');

  useEffect(() => {
    setData(null);
    setActiveTab('Visual');
    apiFetch(`/species/${speciesId}`).then(setData).catch(() => {});
  }, [speciesId]);

  if (!data) return html`<div class="loading">Loading species detail...</div>`;

  const s = data.species;
  const spriteUrl = data.sprite
    ? `${BASE_PATH}/assets/sprites/pixellab/${data.sprite.folderId}/south.png`
    : null;

  return html`
    <div class="container">
      <div class="detail-header">
        ${spriteUrl
          ? html`<img src=${spriteUrl} alt=${s.speciesName} onerror=${(e) => { e.target.style.display = 'none'; }} />`
          : html`<div class="no-sprite" style="width:96px;height:96px;font-size:0.85rem">No sprite</div>`
        }
        <div class="info">
          <h2>${s.speciesName}</h2>
          ${s.commonName && html`<div class="common-name">${s.commonName}</div>`}
          <div class="badges">
            ${s.sapient && html`<span class="badge sapient">Sapient</span>`}
            ${s.cross_game_compatible && html`<span class="badge xgame">Cross-game</span>`}
            <span class="badge">${s.sizeCategory || 'unknown'}</span>
            ${s.lifespanType && html`<span class="badge">${s.lifespanType}</span>`}
          </div>
          <div class="desc">${s.description || 'No description available.'}</div>
          <div class="stats-row" style="margin-top: 0.75rem">
            ${s.averageHeight != null && html`<span class="stat-item"><strong>${s.averageHeight}m</strong> height</span>`}
            ${s.averageWeight != null && html`<span class="stat-item"><strong>${s.averageWeight}kg</strong> weight</span>`}
            ${s.lifespan != null && html`<span class="stat-item"><strong>${s.lifespan}</strong> lifespan</span>`}
            ${s.nativeLanguageId && html`<span class="stat-item">Language: <strong>${s.nativeLanguageId}</strong></span>`}
            ${s.bodyPlanId && html`<span class="stat-item">Body: <strong>${s.bodyPlanId}</strong></span>`}
          </div>
        </div>
      </div>

      <div class="tabs">
        ${TABS.map(tab => html`
          <button class="tab ${activeTab === tab ? 'active' : ''}" key=${tab} onclick=${() => setActiveTab(tab)}>
            ${tab}
          </button>
        `)}
      </div>

      <div class="tab-content">
        ${activeTab === 'Visual' && html`<${VisualTab} species=${s} sprite=${data.sprite} />`}
        ${activeTab === 'Language' && html`<${PlaceholderTab} name="Language" note="Language dictionary, utterances, and voice management will appear here." />`}
        ${activeTab === 'Songs' && html`<${PlaceholderTab} name="Songs" note="Song catalogues and MP3 playback will appear here." />`}
        ${activeTab === 'Wiki' && html`<${PlaceholderTab} name="Wiki" note="Lore entries, myths, holy texts, and unlock events will appear here." />`}
        ${activeTab === 'Items' && html`<${PlaceholderTab} name="Items" note="Item browser and species affinity data will appear here." />`}
        ${activeTab === 'Factions' && html`<${PlaceholderTab} name="Factions" note="Faction relationships, social structures, and political data will appear here." />`}
      </div>
    </div>
  `;
}

function VisualTab({ species, sprite }) {
  if (!sprite) {
    return html`<div class="tab-placeholder">No sprites generated for this species yet.</div>`;
  }

  const baseUrl = `${BASE_PATH}/assets/sprites/pixellab/${sprite.folderId}`;
  const directions = ['south', 'south-west', 'west', 'north-west', 'north', 'north-east', 'east', 'south-east'];

  return html`
    <div>
      <h3 style="font-size: 0.95rem; margin-bottom: 1rem;">Sprite Manifest</h3>
      <div class="stats-row" style="margin-bottom: 1rem;">
        <span class="stat-item">Folder: <strong>${sprite.folderId}</strong></span>
        <span class="stat-item">South: <strong>${sprite.hasSouth ? 'Yes' : 'No'}</strong></span>
        <span class="stat-item">Directions: <strong>${sprite.hasDirections ? '8-dir' : 'Single'}</strong></span>
      </div>
      ${sprite.hasDirections && html`
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          ${directions.map(dir => html`
            <div key=${dir} style="text-align: center;">
              <img src="${baseUrl}/sprites/${dir}.png" alt=${dir}
                style="width: 64px; height: 64px; image-rendering: pixelated; background: rgba(255,255,255,0.05); border-radius: 4px;"
                onerror=${(e) => { e.target.style.opacity = '0.2'; }}
                loading="lazy" />
              <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.25rem;">${dir}</div>
            </div>
          `)}
        </div>
      `}
      ${!sprite.hasDirections && sprite.hasSouth && html`
        <div style="text-align: center;">
          <img src="${baseUrl}/south.png" alt="south"
            style="width: 96px; height: 96px; image-rendering: pixelated; background: rgba(255,255,255,0.05); border-radius: 4px;" />
        </div>
      `}
    </div>
  `;
}

function PlaceholderTab({ name, note }) {
  return html`<div class="tab-placeholder">${note}</div>`;
}

// ============================================================================
// App
// ============================================================================

function App() {
  const route = useRoute();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    if (window.matrixAuth && window.matrixAuth.getUserId) {
      setUserId(window.matrixAuth.getUserId());
    }
  }, []);

  // Parse route
  const speciesMatch = route.match(/^\/species\/(.+)$/);

  if (speciesMatch) {
    const speciesId = decodeURIComponent(speciesMatch[1]);
    return html`
      <${Topbar} title=${speciesId} showBack=${true} userId=${userId} />
      <${SpeciesDetail} speciesId=${speciesId} />
    `;
  }

  return html`
    <${Topbar} title="Lore Bible Admin" showBack=${false} userId=${userId} />
    <${SpeciesGrid} />
  `;
}

// ============================================================================
// Init — auth gate check, then render
// ============================================================================

function tryAuth() {
  const token = getMatrixToken();
  if (!token) return false;

  // Quick validation — try hitting the species endpoint
  apiFetch('/species').then(data => {
    if (data && data.species) {
      hideAuthGate();
      render(html`<${App} />`, document.getElementById('app'));
    } else {
      showAuthGate('Unexpected API response. Are you an admin?');
    }
  }).catch(() => {
    // apiFetch already shows gate on 401/403
  });

  return true;
}

// Login button handler
document.getElementById('auth-login-btn').addEventListener('click', () => {
  if (window.matrixAuth && window.matrixAuth.showLoginModal) {
    window.matrixAuth.showLoginModal();
  } else {
    showAuthGate('Matrix auth not available. Ensure matrix-auth.js is loaded.');
  }
});

// Listen for Matrix auth events
window.addEventListener('matrixAuthReady', (e) => {
  if (e.detail && e.detail.loggedIn) {
    tryAuth();
  }
});

window.addEventListener('matrixAuthLogin', () => {
  tryAuth();
});

// Try immediately if already authenticated
if (getMatrixToken()) {
  tryAuth();
} else {
  // Wait for matrix-auth.js to initialize
  setTimeout(() => {
    if (!tryAuth()) {
      showAuthGate();
    }
  }, 500);
}
