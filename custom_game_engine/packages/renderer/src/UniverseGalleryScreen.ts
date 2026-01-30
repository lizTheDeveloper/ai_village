/**
 * UniverseGalleryScreen - Browse and join universes from the server
 *
 * Shows all universes available on the multiverse server.
 * Users can select a universe to see its planets and join one,
 * or create a new planet within an existing universe.
 */

import { saveLoadService } from '@ai-village/core';

export interface ServerUniverseInfo {
  id: string;
  name: string;
  magicPreset: string;
  magicIntensity: string;
  cosmicDeities: string[];
  planetCount: number;
  playerCount: number;
  createdAt: number;
  createdBy: string;
  isPublic: boolean;
}

export interface UniverseGalleryCallbacks {
  onSelectUniverse: (universeId: string) => void;
  onCreateUniverse: () => void;
  onBack: () => void;
}

export class UniverseGalleryScreen {
  private container: HTMLElement;
  private callbacks: UniverseGalleryCallbacks;
  private universes: ServerUniverseInfo[] = [];
  private loading: boolean = false;
  private error: string | null = null;
  private searchQuery: string = '';
  private filterPublicOnly: boolean = false;
  private highlightUniverseId: string | null = null;

  // Sync state
  private syncing: boolean = false;
  private syncProgress: { current: number; total: number; name: string } | null = null;
  private syncResult: { synced: number; failed: number; skipped: number } | null = null;

  private readonly API_BASE = 'http://localhost:3001/api';

  constructor(containerId: string = 'universe-gallery-screen', callbacks: UniverseGalleryCallbacks) {
    this.callbacks = callbacks;

    const existing = document.getElementById(containerId);
    if (existing) {
      this.container = existing;
    } else {
      this.container = document.createElement('div');
      this.container.id = containerId;
      this.container.className = 'universe-gallery-screen';
      this.container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0a1a2a 100%);
        display: none;
        flex-direction: column;
        z-index: 10000;
        font-family: monospace;
        color: #e0e0e0;
        overflow: hidden;
      `;
      document.body.appendChild(this.container);
    }
  }

  async show(highlightUniverseId?: string): Promise<void> {
    this.highlightUniverseId = highlightUniverseId || null;
    this.container.style.display = 'flex';
    await this.loadUniverses();
    this.render();

    // Scroll to highlighted universe if specified
    if (highlightUniverseId) {
      setTimeout(() => {
        const element = document.getElementById(`universe-card-${highlightUniverseId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.style.animation = 'pulse-highlight 2s ease-in-out';
        }
      }, 100);
    }
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  private async loadUniverses(): Promise<void> {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      const response = await fetch(`${this.API_BASE}/multiverse/universes?limit=100`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch universes from server');
      }

      const data = await response.json();
      this.universes = (data.universes || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        magicPreset: u.magicPreset || 'Unknown',
        magicIntensity: u.magicIntensity || 'medium',
        cosmicDeities: u.cosmicDeities || [],
        planetCount: u.planetCount || 0,
        playerCount: u.playerCount || 0,
        createdAt: u.createdAt,
        createdBy: u.createdBy || 'Unknown',
        isPublic: u.isPublic !== false,
      }));

      // Sort by creation date, newest first
      this.universes.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('[UniverseGallery] Failed to load universes:', error);
      this.error = (error as Error).message;
      this.universes = [];
    } finally {
      this.loading = false;
      this.render();
    }
  }

  private getFilteredUniverses(): ServerUniverseInfo[] {
    let filtered = this.universes;

    if (this.filterPublicOnly) {
      filtered = filtered.filter(u => u.isPublic);
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(query) ||
        u.magicPreset.toLowerCase().includes(query) ||
        u.createdBy.toLowerCase().includes(query)
      );
    }

    return filtered;
  }

  private render(): void {
    this.container.innerHTML = '';

    // Add CSS animation for highlight
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse-highlight {
        0%, 100% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0); }
        50% { box-shadow: 0 0 30px 10px rgba(102, 126, 234, 0.5); }
      }
      @keyframes float-in {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    this.container.appendChild(style);

    // Header
    const header = this.renderHeader();
    this.container.appendChild(header);

    // Main content
    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      padding: 0 40px 40px 40px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    `;

    if (this.loading) {
      content.appendChild(this.renderLoading());
    } else if (this.error) {
      content.appendChild(this.renderError());
    } else {
      content.appendChild(this.renderSearchBar());
      content.appendChild(this.renderUniverseGrid());
    }

    this.container.appendChild(content);
  }

  private renderHeader(): HTMLElement {
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 30px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    `;

    // Left side - back button and title
    const left = document.createElement('div');
    left.style.cssText = 'display: flex; align-items: center; gap: 20px;';

    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back';
    backBtn.style.cssText = `
      padding: 10px 20px;
      font-size: 14px;
      font-family: monospace;
      background: transparent;
      color: #888;
      border: 1px solid #3a3a5a;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    `;
    backBtn.onmouseenter = () => { backBtn.style.borderColor = '#667eea'; backBtn.style.color = '#fff'; };
    backBtn.onmouseleave = () => { backBtn.style.borderColor = '#3a3a5a'; backBtn.style.color = '#888'; };
    backBtn.onclick = () => this.callbacks.onBack();
    left.appendChild(backBtn);

    const title = document.createElement('h1');
    title.textContent = '🌌 Universe Gallery';
    title.style.cssText = `
      margin: 0;
      font-size: 32px;
      font-weight: normal;
      color: #fff;
      text-shadow: 0 0 20px rgba(100, 150, 255, 0.3);
    `;
    left.appendChild(title);

    header.appendChild(left);

    // Right side - create button
    const createBtn = document.createElement('button');
    createBtn.textContent = '✨ Create New Universe';
    createBtn.style.cssText = `
      padding: 14px 28px;
      font-size: 16px;
      font-family: monospace;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    `;
    createBtn.onmouseenter = () => {
      createBtn.style.transform = 'scale(1.05)';
      createBtn.style.boxShadow = '0 0 30px rgba(102, 126, 234, 0.4)';
    };
    createBtn.onmouseleave = () => {
      createBtn.style.transform = 'scale(1)';
      createBtn.style.boxShadow = 'none';
    };
    createBtn.onclick = () => this.callbacks.onCreateUniverse();
    header.appendChild(createBtn);

    return header;
  }

  private renderSearchBar(): HTMLElement {
    const bar = document.createElement('div');
    bar.style.cssText = `
      display: flex;
      gap: 15px;
      margin-bottom: 25px;
      align-items: center;
    `;

    // Search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search universes...';
    searchInput.value = this.searchQuery;
    searchInput.style.cssText = `
      flex: 1;
      max-width: 400px;
      padding: 12px 16px;
      font-size: 14px;
      font-family: monospace;
      background: rgba(30, 30, 50, 0.8);
      border: 1px solid #3a3a5a;
      border-radius: 8px;
      color: #fff;
      outline: none;
      transition: border-color 0.2s;
    `;
    searchInput.onfocus = () => { searchInput.style.borderColor = '#667eea'; };
    searchInput.onblur = () => { searchInput.style.borderColor = '#3a3a5a'; };
    searchInput.oninput = () => {
      this.searchQuery = searchInput.value;
      this.render();
    };
    bar.appendChild(searchInput);

    // Filter toggle
    const filterBtn = document.createElement('button');
    filterBtn.textContent = this.filterPublicOnly ? '🌐 Public Only' : '🔓 All Universes';
    filterBtn.style.cssText = `
      padding: 12px 20px;
      font-size: 14px;
      font-family: monospace;
      background: ${this.filterPublicOnly ? 'rgba(102, 126, 234, 0.2)' : 'transparent'};
      color: ${this.filterPublicOnly ? '#667eea' : '#888'};
      border: 1px solid ${this.filterPublicOnly ? '#667eea' : '#3a3a5a'};
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    `;
    filterBtn.onclick = () => {
      this.filterPublicOnly = !this.filterPublicOnly;
      this.render();
    };
    bar.appendChild(filterBtn);

    // Sync local saves button
    const syncBtn = document.createElement('button');
    syncBtn.textContent = this.syncing
      ? `⏳ Syncing... (${this.syncProgress?.current || 0}/${this.syncProgress?.total || 0})`
      : '📤 Sync Local Saves';
    syncBtn.style.cssText = `
      padding: 12px 20px;
      font-size: 14px;
      font-family: monospace;
      background: ${this.syncing ? 'rgba(255, 165, 0, 0.2)' : 'transparent'};
      color: ${this.syncing ? '#ffa500' : '#888'};
      border: 1px solid ${this.syncing ? '#ffa500' : '#3a3a5a'};
      border-radius: 8px;
      cursor: ${this.syncing ? 'default' : 'pointer'};
      transition: all 0.2s;
    `;
    if (!this.syncing) {
      syncBtn.onmouseenter = () => { syncBtn.style.borderColor = '#4CAF50'; syncBtn.style.color = '#4CAF50'; };
      syncBtn.onmouseleave = () => { syncBtn.style.borderColor = '#3a3a5a'; syncBtn.style.color = '#888'; };
      syncBtn.onclick = () => this.handleSyncLocalSaves();
    }
    bar.appendChild(syncBtn);

    // Stats
    const filtered = this.getFilteredUniverses();
    const stats = document.createElement('span');
    stats.textContent = `${filtered.length} universe${filtered.length !== 1 ? 's' : ''}`;
    stats.style.cssText = 'font-size: 14px; color: #666; margin-left: auto;';
    bar.appendChild(stats);

    // Show sync result if available
    if (this.syncResult) {
      const resultText = document.createElement('span');
      resultText.style.cssText = `
        font-size: 12px;
        color: ${this.syncResult.failed > 0 ? '#ffa500' : '#4CAF50'};
        margin-left: 15px;
      `;
      resultText.textContent = `✓ ${this.syncResult.synced} synced` +
        (this.syncResult.failed > 0 ? `, ${this.syncResult.failed} failed` : '') +
        (this.syncResult.skipped > 0 ? `, ${this.syncResult.skipped} skipped` : '');
      bar.appendChild(resultText);
    }

    return bar;
  }

  private async handleSyncLocalSaves(): Promise<void> {
    if (this.syncing) return;

    // Check if server sync is enabled
    if (!saveLoadService.isServerSyncEnabled()) {
      // Try to enable it with a default player ID
      const playerId = `player_${Date.now()}`;
      const enabled = await saveLoadService.enableServerSync(playerId);
      if (!enabled) {
        alert('Could not connect to multiverse server. Please try again later.');
        return;
      }
    }

    this.syncing = true;
    this.syncProgress = null;
    this.syncResult = null;
    this.render();

    try {
      const result = await saveLoadService.syncAllLocalSavesToServer({
        onProgress: (current, total, name) => {
          this.syncProgress = { current, total, name };
          this.render();
        },
      });

      this.syncResult = {
        synced: result.synced,
        failed: result.failed,
        skipped: result.skipped,
      };

      // Refresh universe list to show any newly synced universes
      await this.loadUniverses();
    } catch (error) {
      console.error('[UniverseGallery] Sync failed:', error);
      alert(`Sync failed: ${(error as Error).message}`);
    } finally {
      this.syncing = false;
      this.syncProgress = null;
      this.render();
    }
  }

  private renderUniverseGrid(): HTMLElement {
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    `;

    const filtered = this.getFilteredUniverses();

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = `
        grid-column: 1 / -1;
        text-align: center;
        padding: 80px 20px;
        color: #666;
      `;
      empty.innerHTML = `
        <div style="font-size: 64px; margin-bottom: 20px; opacity: 0.5;">🌌</div>
        <div style="font-size: 18px; margin-bottom: 10px;">No universes found</div>
        <div style="font-size: 14px; color: #555;">
          ${this.searchQuery ? 'Try a different search term' : 'Be the first to create a universe!'}
        </div>
      `;
      grid.appendChild(empty);
      return grid;
    }

    filtered.forEach((universe, index) => {
      const card = this.renderUniverseCard(universe, index);
      grid.appendChild(card);
    });

    return grid;
  }

  private renderUniverseCard(universe: ServerUniverseInfo, index: number): HTMLElement {
    const isHighlighted = universe.id === this.highlightUniverseId;

    const card = document.createElement('div');
    card.id = `universe-card-${universe.id}`;
    card.style.cssText = `
      background: ${isHighlighted ? 'rgba(102, 126, 234, 0.15)' : 'rgba(30, 30, 50, 0.8)'};
      border: 2px solid ${isHighlighted ? '#667eea' : '#3a3a5a'};
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.2s;
      animation: float-in 0.3s ease-out ${index * 0.05}s both;
    `;
    card.onmouseenter = () => {
      card.style.borderColor = '#667eea';
      card.style.transform = 'translateY(-4px)';
      card.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
    };
    card.onmouseleave = () => {
      card.style.borderColor = isHighlighted ? '#667eea' : '#3a3a5a';
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = 'none';
    };
    card.onclick = () => this.callbacks.onSelectUniverse(universe.id);

    // Header row
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;';

    const name = document.createElement('div');
    name.textContent = universe.name;
    name.style.cssText = 'font-size: 18px; font-weight: bold; color: #fff; flex: 1;';
    headerRow.appendChild(name);

    if (isHighlighted) {
      const newBadge = document.createElement('span');
      newBadge.textContent = 'NEW';
      newBadge.style.cssText = `
        padding: 4px 10px;
        font-size: 10px;
        font-weight: bold;
        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        color: #fff;
        border-radius: 12px;
      `;
      headerRow.appendChild(newBadge);
    }

    if (universe.isPublic) {
      const publicBadge = document.createElement('span');
      publicBadge.textContent = '🌐';
      publicBadge.title = 'Public Universe';
      publicBadge.style.cssText = 'font-size: 16px; margin-left: 8px;';
      headerRow.appendChild(publicBadge);
    }

    card.appendChild(headerRow);

    // Magic info
    const magicInfo = document.createElement('div');
    magicInfo.style.cssText = 'margin-bottom: 12px;';

    const intensityColors: Record<string, string> = {
      null: '#666',
      rare: '#888',
      low: '#9999ff',
      medium: '#7799ff',
      high: '#ff9900',
      reality_is_magic: '#ff00ff',
    };

    magicInfo.innerHTML = `
      <div style="font-size: 12px; color: #888; margin-bottom: 4px;">Magic System</div>
      <div style="font-size: 14px; color: ${intensityColors[universe.magicIntensity] || '#aaa'};">
        ${universe.magicPreset} (${universe.magicIntensity})
      </div>
    `;
    card.appendChild(magicInfo);

    // Cosmic deities
    if (universe.cosmicDeities.length > 0) {
      const deities = document.createElement('div');
      deities.style.cssText = 'margin-bottom: 12px;';
      deities.innerHTML = `
        <div style="font-size: 12px; color: #888; margin-bottom: 4px;">Cosmic Deities</div>
        <div style="font-size: 13px; color: #c8a8e8;">
          ${universe.cosmicDeities.slice(0, 3).join(', ')}${universe.cosmicDeities.length > 3 ? ` +${universe.cosmicDeities.length - 3} more` : ''}
        </div>
      `;
      card.appendChild(deities);
    }

    // Stats row
    const stats = document.createElement('div');
    stats.style.cssText = 'display: flex; gap: 20px; font-size: 12px; color: #888; margin-top: 15px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);';
    stats.innerHTML = `
      <span>🪐 ${universe.planetCount} planet${universe.planetCount !== 1 ? 's' : ''}</span>
      <span>👥 ${universe.playerCount} player${universe.playerCount !== 1 ? 's' : ''}</span>
    `;
    card.appendChild(stats);

    // Created info
    const created = document.createElement('div');
    const date = new Date(universe.createdAt);
    created.style.cssText = 'font-size: 11px; color: #555; margin-top: 10px;';
    created.textContent = `Created ${date.toLocaleDateString()} by ${universe.createdBy}`;
    card.appendChild(created);

    return card;
  }

  private renderLoading(): HTMLElement {
    const loading = document.createElement('div');
    loading.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #888;
    `;
    loading.innerHTML = `
      <div style="font-size: 64px; margin-bottom: 20px; animation: pulse 1.5s ease-in-out infinite;">🌌</div>
      <div style="font-size: 18px;">Connecting to the Multiverse...</div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 0.7; }
        50% { transform: scale(1.1); opacity: 1; }
      }
    `;
    loading.appendChild(style);

    return loading;
  }

  private renderError(): HTMLElement {
    const error = document.createElement('div');
    error.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #888;
      text-align: center;
    `;
    error.innerHTML = `
      <div style="font-size: 64px; margin-bottom: 20px;">❌</div>
      <div style="font-size: 18px; color: #f44336; margin-bottom: 10px;">Failed to Connect</div>
      <div style="font-size: 14px; color: #666; margin-bottom: 25px; max-width: 400px;">
        ${this.error || 'Could not connect to the multiverse server'}
      </div>
      <button id="retry-btn" style="
        padding: 12px 24px;
        font-size: 14px;
        font-family: monospace;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: #fff;
        border: none;
        border-radius: 8px;
        cursor: pointer;
      ">Retry</button>
    `;

    setTimeout(() => {
      const retryBtn = document.getElementById('retry-btn');
      if (retryBtn) {
        retryBtn.onclick = () => this.loadUniverses();
      }
    }, 0);

    return error;
  }

  destroy(): void {
    this.container.remove();
  }
}
