/**
 * UniverseBrowserScreen - Browse, create, and load universes
 *
 * This screen appears before the main game to allow players to:
 * - Create a new universe
 * - Load an existing local save
 * - Browse universes from the multiverse server
 * - Time travel to specific snapshots
 *
 * This is the "Launch Game" entry point that precedes UniverseConfigScreen.
 */

import { saveLoadService } from '@ai-village/core';
import type { PersistenceSaveMetadata as SaveMetadata } from '@ai-village/core';
import { MultiverseTimelineView, type TimelineUniverse, type TimelineSnapshot } from './MultiverseTimelineView.js';
import { getPlayerId } from './utils/GameStateHelpers.js';

export interface UniverseBrowserResult {
  action: 'create_new' | 'load_local' | 'load_server';
  saveKey?: string;  // For local loads
  universeId?: string;  // For server loads
  snapshotTick?: number;  // For time travel
}

interface ServerUniverse {
  id: string;
  name: string;
  ownerId: string;
  createdAt: number;
  lastSnapshotAt: number;
  snapshotCount: number;
  canonicalEventCount: number;
  isPublic: boolean;
  forkOf?: {
    universeId: string;
    snapshotTick: number;
    universeName?: string;  // Resolved parent name
  };
  forkCount?: number;  // Number of forks spawned from this universe
}

interface ServerSnapshot {
  tick: number;
  day: number;
  timestamp: number;
  type: 'auto' | 'manual' | 'canonical';
  canonEvent?: {
    type: string;
    title: string;
    description: string;
  };
}

export class UniverseBrowserScreen {
  private container: HTMLElement;
  private _onSelect: ((result: UniverseBrowserResult) => void) | null = null;
  private localSaves: SaveMetadata[] = [];
  private serverUniverses: ServerUniverse[] = [];
  private selectedServerUniverse: ServerUniverse | null = null;
  private serverSnapshots: ServerSnapshot[] = [];
  private isLoadingServer: boolean = false;
  private serverError: string | null = null;
  private currentTab: 'local' | 'server' | 'timeline' = 'timeline';  // Default to timeline view
  private serverAvailable: boolean = false;
  private timelineView: MultiverseTimelineView | null = null;
  private timelineContainer: HTMLElement | null = null;
  private universeSnapshotsCache: Map<string, ServerSnapshot[]> = new Map();

  private readonly API_BASE = 'http://localhost:3001/api';

  constructor(containerId: string = 'universe-browser-screen') {
    const existing = document.getElementById(containerId);
    if (existing) {
      this.container = existing;
    } else {
      this.container = document.createElement('div');
      this.container.id = containerId;
      this.container.className = 'universe-browser-screen';
      this.container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
        display: none;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        padding: 40px;
        box-sizing: border-box;
        z-index: 10000;
        font-family: monospace;
        color: #e0e0e0;
        overflow-y: auto;
      `;
      document.body.appendChild(this.container);
    }
  }

  async show(onSelectCallback: (result: UniverseBrowserResult) => void): Promise<void> {
    this._onSelect = onSelectCallback;
    this.container.style.display = 'flex';

    // Load data
    await this.loadLocalSaves();
    // Server availability check is deferred to avoid browser console errors
    // when API server (port 3001) isn't running. Users can manually connect
    // via the server section if available.
    this.serverAvailable = false;

    this.render();
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  private async loadLocalSaves(): Promise<void> {
    try {
      this.localSaves = await saveLoadService.listSaves();
      // Sort by last saved date, newest first
      this.localSaves.sort((a, b) => b.lastSavedAt - a.lastSavedAt);
    } catch (error) {
      console.warn('[UniverseBrowser] Failed to load local saves:', error);
      this.localSaves = [];
    }
  }

  private async checkServerAvailability(): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/multiverse/stats`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      this.serverAvailable = response.ok;
    } catch {
      this.serverAvailable = false;
    }
  }

  private async loadServerUniverses(): Promise<void> {
    this.isLoadingServer = true;
    this.serverError = null;
    this.render();

    try {
      const response = await fetch(`${this.API_BASE}/multiverse/universes?limit=50`);
      if (!response.ok) throw new Error('Failed to fetch universes');
      const data = await response.json();
      this.serverUniverses = data.universes || [];

      // Enrich with fork counts and parent names
      await this.enrichUniversesWithForkData();
    } catch (error) {
      console.warn('[UniverseBrowser] Failed to load server universes:', error);
      this.serverError = (error as Error).message;
      this.serverUniverses = [];
    } finally {
      this.isLoadingServer = false;
      this.render();
    }
  }

  /**
   * Enrich universes with fork counts and resolve parent universe names
   */
  private async enrichUniversesWithForkData(): Promise<void> {
    // Build a map of universe ID -> name for quick lookup
    const universeNameMap = new Map<string, string>();
    for (const u of this.serverUniverses) {
      universeNameMap.set(u.id, u.name);
    }

    // For each universe, fetch fork count and resolve parent name
    const enrichPromises = this.serverUniverses.map(async (universe) => {
      // Fetch fork count
      try {
        const forksResponse = await fetch(`${this.API_BASE}/multiverse/universe/${universe.id}/forks`);
        if (forksResponse.ok) {
          const forksData = await forksResponse.json();
          universe.forkCount = forksData.forks?.length || 0;
        }
      } catch {
        universe.forkCount = 0;
      }

      // Resolve parent universe name if this is a fork
      if (universe.forkOf) {
        // First check our local map
        if (universeNameMap.has(universe.forkOf.universeId)) {
          universe.forkOf.universeName = universeNameMap.get(universe.forkOf.universeId);
        } else {
          // Fetch parent metadata
          try {
            const parentResponse = await fetch(`${this.API_BASE}/multiverse/universe/${universe.forkOf.universeId}`);
            if (parentResponse.ok) {
              const parentData = await parentResponse.json();
              universe.forkOf.universeName = parentData.universe?.name;
            }
          } catch {
            // Leave name undefined
          }
        }
      }
    });

    await Promise.all(enrichPromises);
  }

  private async loadUniverseSnapshots(universeId: string): Promise<void> {
    this.isLoadingServer = true;
    this.render();

    try {
      const response = await fetch(`${this.API_BASE}/multiverse/universe/${universeId}/snapshots`);
      if (!response.ok) throw new Error('Failed to fetch snapshots');
      const data = await response.json();
      this.serverSnapshots = data.snapshots || [];
    } catch (error) {
      console.warn('[UniverseBrowser] Failed to load snapshots:', error);
      this.serverSnapshots = [];
    } finally {
      this.isLoadingServer = false;
      this.render();
    }
  }

  private render(): void {
    this.container.innerHTML = '';

    // Title
    const title = document.createElement('h1');
    title.textContent = '🌌 Multiverse Gateway';
    title.style.cssText = `
      margin: 0 0 10px 0;
      font-size: 42px;
      text-align: center;
      color: #ffffff;
      text-shadow: 0 0 30px rgba(100, 200, 255, 0.5);
    `;
    this.container.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Choose your path through the infinite possibilities';
    subtitle.style.cssText = 'margin: 0 0 40px 0; font-size: 16px; text-align: center; color: #888;';
    this.container.appendChild(subtitle);

    // Main content container
    const mainContent = document.createElement('div');
    mainContent.style.cssText = 'display: flex; gap: 40px; max-width: 1400px; width: 100%;';

    // Left panel - Create New
    mainContent.appendChild(this.renderCreateNewPanel());

    // Right panel - Load Existing (tabbed)
    mainContent.appendChild(this.renderLoadPanel());

    this.container.appendChild(mainContent);
  }

  private renderCreateNewPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      flex: 0 0 350px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      border: 2px solid rgba(102, 126, 234, 0.5);
      border-radius: 16px;
      padding: 30px;
      display: flex;
      flex-direction: column;
      align-items: center;
    `;

    const icon = document.createElement('div');
    icon.textContent = '✨';
    icon.style.cssText = 'font-size: 64px; margin-bottom: 20px;';
    panel.appendChild(icon);

    const header = document.createElement('h2');
    header.textContent = 'Create New Universe';
    header.style.cssText = 'margin: 0 0 15px 0; font-size: 24px; color: #fff; text-align: center;';
    panel.appendChild(header);

    const description = document.createElement('p');
    description.textContent = 'Begin a fresh journey. Configure magic systems, choose your starting scenario, and birth new souls.';
    description.style.cssText = 'margin: 0 0 30px 0; font-size: 14px; color: #aaa; text-align: center; line-height: 1.6;';
    panel.appendChild(description);

    const features = document.createElement('ul');
    features.style.cssText = 'list-style: none; padding: 0; margin: 0 0 30px 0; text-align: left; width: 100%;';
    const featureItems = [
      '🎭 Choose magic paradigm',
      '📖 Select starting scenario',
      '👥 Create initial souls',
      '🌍 Generate unique world',
    ];
    for (const item of featureItems) {
      const li = document.createElement('li');
      li.textContent = item;
      li.style.cssText = 'padding: 8px 0; font-size: 14px; color: #ccc; border-bottom: 1px solid rgba(255,255,255,0.1);';
      features.appendChild(li);
    }
    panel.appendChild(features);

    const createButton = document.createElement('button');
    createButton.textContent = '🚀 Create New Universe';
    createButton.style.cssText = `
      padding: 18px 35px;
      font-size: 18px;
      font-family: monospace;
      font-weight: bold;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      width: 100%;
    `;
    createButton.onmouseover = () => {
      createButton.style.transform = 'translateY(-2px)';
      createButton.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
    };
    createButton.onmouseout = () => {
      createButton.style.transform = 'translateY(0)';
      createButton.style.boxShadow = 'none';
    };
    createButton.onclick = () => {
      if (this._onSelect) {
        this.hide();
        this._onSelect({ action: 'create_new' });
      }
    };
    panel.appendChild(createButton);

    return panel;
  }

  private renderLoadPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      flex: 1;
      background: rgba(30, 30, 50, 0.8);
      border: 1px solid #3a3a5a;
      border-radius: 16px;
      padding: 25px;
      min-height: 500px;
    `;

    // Tab bar
    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display: flex; gap: 10px; margin-bottom: 20px;';

    const localTab = this.createTab('💾 Local Saves', this.currentTab === 'local', () => {
      this.currentTab = 'local';
      this.selectedServerUniverse = null;
      this.destroyTimelineView();
      this.render();
    });
    const serverTab = this.createTab(
      `🌐 Multiverse ${this.serverAvailable ? '' : '(Offline)'}`,
      this.currentTab === 'server',
      () => {
        if (this.serverAvailable) {
          this.currentTab = 'server';
          this.destroyTimelineView();
          this.render();
        }
      },
      !this.serverAvailable
    );
    const timelineTab = this.createTab(
      `🌳 Timeline Graph ${this.serverAvailable ? '' : '(Offline)'}`,
      this.currentTab === 'timeline',
      () => {
        if (this.serverAvailable) {
          this.currentTab = 'timeline';
          this.selectedServerUniverse = null;
          this.render();
          this.initializeTimelineView();
        }
      },
      !this.serverAvailable
    );

    tabBar.appendChild(localTab);
    tabBar.appendChild(serverTab);
    tabBar.appendChild(timelineTab);
    panel.appendChild(tabBar);

    // Content based on tab
    if (this.currentTab === 'local') {
      panel.appendChild(this.renderLocalSaves());
    } else if (this.currentTab === 'timeline') {
      panel.appendChild(this.renderTimelineContainer());
    } else {
      if (this.selectedServerUniverse) {
        panel.appendChild(this.renderUniverseDetail());
      } else {
        panel.appendChild(this.renderServerUniverses());
      }
    }

    return panel;
  }

  /**
   * Render the timeline container
   */
  private renderTimelineContainer(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      width: 100%;
      height: 500px;
      border-radius: 8px;
      overflow: auto;
      position: relative;
      scrollbar-width: thin;
      scrollbar-color: #4a4a6a #1a1a2e;
    `;
    container.id = 'multiverse-timeline-container';
    this.timelineContainer = container;

    // Add webkit scrollbar styling
    const style = document.createElement('style');
    style.textContent = `
      #multiverse-timeline-container::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      #multiverse-timeline-container::-webkit-scrollbar-track {
        background: #1a1a2e;
        border-radius: 4px;
      }
      #multiverse-timeline-container::-webkit-scrollbar-thumb {
        background: #4a4a6a;
        border-radius: 4px;
      }
      #multiverse-timeline-container::-webkit-scrollbar-thumb:hover {
        background: #6a6a8a;
      }
    `;
    container.appendChild(style);

    // Loading indicator
    if (this.isLoadingServer) {
      const loading = document.createElement('div');
      loading.style.cssText = 'text-align: center; padding: 60px 20px; color: #888;';
      loading.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px; animation: pulse 1s infinite;">🌳</div>
        <div style="font-size: 16px;">Building timeline graph...</div>
      `;
      container.appendChild(loading);
    }

    return container;
  }

  /**
   * Initialize the timeline view with data
   */
  private async initializeTimelineView(): Promise<void> {
    if (!this.timelineContainer) return;

    // Clean up existing view
    this.destroyTimelineView();

    // Create the timeline view
    this.timelineView = new MultiverseTimelineView(this.timelineContainer, {
      onSelectSnapshot: (universeId, snapshot) => {
        // Snapshot selected
      },
      onForkFromSnapshot: async (universeId, snapshot) => {
        const universe = this.serverUniverses.find(u => u.id === universeId);
        if (universe) {
          await this.handleForkUniverse(universe, snapshot as ServerSnapshot);
        }
      },
      onLoadUniverse: (universeId, snapshotTick) => {
        if (this._onSelect) {
          this.hide();
          this._onSelect({
            action: 'load_server',
            universeId,
            snapshotTick,
          });
        }
      },
    });

    // Load snapshots for all universes
    await this.loadAllUniverseSnapshots();

    // Build timeline data - filter out deleted universes
    // Timeline only shows server universes (local saves should sync to server)
    const timelineUniverses: TimelineUniverse[] = this.serverUniverses
      .filter(u => !u.name.startsWith('[DELETED]'))
      .map(u => ({
        id: u.id,
        name: u.name,
        createdAt: u.createdAt,
        forkOf: u.forkOf,
        snapshots: this.universeSnapshotsCache.get(u.id) || [],
      }));

    // Update the view
    this.timelineView.update(timelineUniverses);
  }

  /**
   * Load snapshots for all universes (for timeline view)
   */
  private async loadAllUniverseSnapshots(): Promise<void> {
    this.isLoadingServer = true;

    const loadPromises = this.serverUniverses.map(async (universe) => {
      if (this.universeSnapshotsCache.has(universe.id)) return;

      try {
        const response = await fetch(`${this.API_BASE}/multiverse/universe/${universe.id}/snapshots`);
        if (response.ok) {
          const data = await response.json();
          this.universeSnapshotsCache.set(universe.id, data.snapshots || []);
        }
      } catch (error) {
        console.warn(`[UniverseBrowser] Failed to load snapshots for ${universe.id}:`, error);
        this.universeSnapshotsCache.set(universe.id, []);
      }
    });

    await Promise.all(loadPromises);
    this.isLoadingServer = false;
  }

  /**
   * Destroy the timeline view
   */
  private destroyTimelineView(): void {
    if (this.timelineView) {
      this.timelineView.destroy();
      this.timelineView = null;
    }
  }

  private createTab(text: string, isActive: boolean, onClick: () => void, disabled: boolean = false): HTMLElement {
    const tab = document.createElement('button');
    tab.textContent = text;
    tab.disabled = disabled;
    tab.style.cssText = `
      padding: 12px 24px;
      font-size: 14px;
      font-family: monospace;
      background: ${isActive ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent'};
      color: ${disabled ? '#555' : isActive ? '#fff' : '#888'};
      border: 1px solid ${isActive ? '#667eea' : '#3a3a5a'};
      border-radius: 8px;
      cursor: ${disabled ? 'not-allowed' : 'pointer'};
      transition: all 0.2s;
    `;
    if (!disabled) {
      tab.onclick = onClick;
    }
    return tab;
  }

  private renderLocalSaves(): HTMLElement {
    const container = document.createElement('div');

    if (this.localSaves.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align: center; padding: 60px 20px; color: #666;';
      empty.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">📭</div>
        <div style="font-size: 18px; margin-bottom: 10px;">No saved universes yet</div>
        <div style="font-size: 14px;">Create a new universe to begin your journey</div>
      `;
      container.appendChild(empty);
      return container;
    }

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;';
    header.innerHTML = `
      <span style="font-size: 14px; color: #888;">${this.localSaves.length} saved universe${this.localSaves.length !== 1 ? 's' : ''}</span>
    `;
    container.appendChild(header);

    const list = document.createElement('div');
    list.style.cssText = 'display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto;';

    for (const save of this.localSaves) {
      const item = this.renderSaveItem(save);
      list.appendChild(item);
    }

    container.appendChild(list);
    return container;
  }

  private renderSaveItem(save: SaveMetadata): HTMLElement {
    const item = document.createElement('div');
    item.style.cssText = `
      background: rgba(50, 50, 70, 0.5);
      border: 1px solid #4a4a6a;
      border-radius: 10px;
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.2s;
      cursor: pointer;
    `;
    item.onmouseover = () => {
      item.style.background = 'rgba(70, 70, 100, 0.5)';
      item.style.borderColor = '#667eea';
    };
    item.onmouseout = () => {
      item.style.background = 'rgba(50, 50, 70, 0.5)';
      item.style.borderColor = '#4a4a6a';
    };

    const info = document.createElement('div');
    const date = new Date(save.lastSavedAt);
    const playTimeMinutes = Math.floor(save.playTime / 60);

    info.innerHTML = `
      <div style="font-size: 16px; color: #fff; font-weight: bold; margin-bottom: 5px;">
        ${save.name}
      </div>
      <div style="font-size: 12px; color: #888;">
        ${date.toLocaleDateString()} ${date.toLocaleTimeString()} • ${playTimeMinutes} min played
      </div>
    `;
    item.appendChild(info);

    const loadButton = document.createElement('button');
    loadButton.textContent = '▶ Load';
    loadButton.style.cssText = `
      padding: 10px 20px;
      font-size: 14px;
      font-family: monospace;
      background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
      color: #fff;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    `;
    loadButton.onclick = (e) => {
      e.stopPropagation();
      if (this._onSelect) {
        this.hide();
        this._onSelect({ action: 'load_local', saveKey: save.key });
      }
    };
    item.appendChild(loadButton);

    return item;
  }

  private renderServerUniverses(): HTMLElement {
    const container = document.createElement('div');

    if (this.isLoadingServer) {
      const loading = document.createElement('div');
      loading.style.cssText = 'text-align: center; padding: 60px 20px; color: #888;';
      loading.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px; animation: pulse 1s infinite;">🌐</div>
        <div style="font-size: 16px;">Connecting to the Multiverse...</div>
      `;
      container.appendChild(loading);
      return container;
    }

    if (this.serverError) {
      const error = document.createElement('div');
      error.style.cssText = 'text-align: center; padding: 60px 20px; color: #f44336;';
      error.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
        <div style="font-size: 16px; margin-bottom: 10px;">Failed to connect</div>
        <div style="font-size: 14px; color: #888;">${this.serverError}</div>
      `;
      container.appendChild(error);
      return container;
    }

    // Filter out deleted universes
    const visibleUniverses = this.serverUniverses.filter(u => !u.name.startsWith('[DELETED]'));

    if (visibleUniverses.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align: center; padding: 60px 20px; color: #666;';
      empty.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">🌌</div>
        <div style="font-size: 18px; margin-bottom: 10px;">No universes in the multiverse yet</div>
        <div style="font-size: 14px;">Be the first to create and share a universe!</div>
      `;
      container.appendChild(empty);
      return container;
    }

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;';
    header.innerHTML = `
      <span style="font-size: 14px; color: #888;">${visibleUniverses.length} universe${visibleUniverses.length !== 1 ? 's' : ''} in the multiverse</span>
    `;
    container.appendChild(header);

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; max-height: 400px; overflow-y: auto;';

    for (const universe of visibleUniverses) {
      const card = this.renderUniverseCard(universe);
      grid.appendChild(card);
    }

    container.appendChild(grid);
    return container;
  }

  private renderUniverseCard(universe: ServerUniverse): HTMLElement {
    const card = document.createElement('div');
    const isFork = !!universe.forkOf;
    const hasForks = (universe.forkCount ?? 0) > 0;

    card.style.cssText = `
      background: ${isFork ? 'rgba(50, 40, 60, 0.8)' : 'rgba(40, 40, 60, 0.8)'};
      border: 1px solid ${isFork ? '#8a6aaa' : '#4a4a6a'};
      border-radius: 12px;
      padding: 18px;
      cursor: pointer;
      transition: all 0.2s;
    `;
    card.onmouseover = () => {
      card.style.borderColor = '#667eea';
      card.style.transform = 'translateY(-2px)';
    };
    card.onmouseout = () => {
      card.style.borderColor = isFork ? '#8a6aaa' : '#4a4a6a';
      card.style.transform = 'translateY(0)';
    };
    card.onclick = async () => {
      this.selectedServerUniverse = universe;
      await this.loadUniverseSnapshots(universe.id);
    };

    const date = new Date(universe.lastSnapshotAt);

    // Build fork lineage badge
    let forkBadge = '';
    if (isFork) {
      const parentName = universe.forkOf?.universeName || 'Unknown Universe';
      const tick = universe.forkOf?.snapshotTick || 0;
      forkBadge = `
        <div style="font-size: 10px; color: #b88fdf; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
          <span>🌿</span>
          <span>Forked from <strong>${this.truncateName(parentName, 20)}</strong> @ tick ${tick}</span>
        </div>
      `;
    }

    // Build fork count badge
    let forkCountBadge = '';
    if (hasForks) {
      forkCountBadge = `<span title="${universe.forkCount} timeline${universe.forkCount !== 1 ? 's' : ''} branched from here">🌿 ${universe.forkCount} fork${universe.forkCount !== 1 ? 's' : ''}</span>`;
    }

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
        <div style="font-size: 16px; color: #fff; font-weight: bold;">${universe.name}</div>
        <div style="display: flex; gap: 6px;">
          ${isFork ? '<span style="font-size: 10px; padding: 3px 8px; background: rgba(138, 106, 170, 0.3); color: #c8a8e8; border-radius: 10px;">Fork</span>' : ''}
          ${universe.isPublic ? '<span style="font-size: 10px; padding: 3px 8px; background: rgba(76, 175, 80, 0.3); color: #8fdf8f; border-radius: 10px;">Public</span>' : ''}
        </div>
      </div>
      ${forkBadge}
      <div style="font-size: 12px; color: #888; margin-bottom: 8px;">
        Last activity: ${date.toLocaleDateString()}
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 11px; color: #aaa;">
        <span>📸 ${universe.snapshotCount} snapshots</span>
        <span>⭐ ${universe.canonicalEventCount} canon events</span>
        ${forkCountBadge}
      </div>
    `;

    return card;
  }

  /**
   * Truncate a name with ellipsis if too long
   */
  private truncateName(name: string, maxLen: number): string {
    if (name.length <= maxLen) return name;
    return name.substring(0, maxLen - 3) + '...';
  }

  private renderUniverseDetail(): HTMLElement {
    const container = document.createElement('div');
    const universe = this.selectedServerUniverse!;
    const isFork = !!universe.forkOf;
    const hasForks = (universe.forkCount ?? 0) > 0;

    // Back button
    const backButton = document.createElement('button');
    backButton.textContent = '← Back to Universes';
    backButton.style.cssText = `
      padding: 8px 16px;
      font-size: 12px;
      font-family: monospace;
      background: transparent;
      color: #888;
      border: 1px solid #4a4a6a;
      border-radius: 6px;
      cursor: pointer;
      margin-bottom: 20px;
    `;
    backButton.onclick = () => {
      this.selectedServerUniverse = null;
      this.serverSnapshots = [];
      this.render();
    };
    container.appendChild(backButton);

    // Universe header with fork info
    const header = document.createElement('div');
    header.style.cssText = 'margin-bottom: 25px;';

    // Build fork lineage section
    let forkLineageHtml = '';
    if (isFork) {
      const parentName = universe.forkOf?.universeName || 'Unknown Universe';
      const tick = universe.forkOf?.snapshotTick || 0;
      forkLineageHtml = `
        <div style="font-size: 12px; color: #b88fdf; margin-bottom: 10px; padding: 10px; background: rgba(138, 106, 170, 0.15); border-radius: 8px; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px;">🌿</span>
          <div>
            <div>Branched timeline from <strong style="color: #c8a8e8;">${parentName}</strong></div>
            <div style="font-size: 11px; color: #888;">at tick ${tick}</div>
          </div>
        </div>
      `;
    }

    // Build children forks section
    let childForksHtml = '';
    if (hasForks) {
      childForksHtml = `
        <div style="font-size: 12px; color: #8fdf8f; margin-bottom: 10px; padding: 8px 10px; background: rgba(76, 175, 80, 0.1); border-radius: 6px;">
          🌳 This universe has spawned <strong>${universe.forkCount}</strong> alternate timeline${universe.forkCount !== 1 ? 's' : ''}
        </div>
      `;
    }

    header.innerHTML = `
      <h2 style="margin: 0 0 10px 0; font-size: 24px; color: #fff;">${universe.name}</h2>
      ${forkLineageHtml}
      ${childForksHtml}
      <div style="font-size: 13px; color: #888;">
        ${universe.snapshotCount} snapshots • ${universe.canonicalEventCount} canon events
      </div>
    `;
    container.appendChild(header);

    // Timeline / Snapshots
    if (this.isLoadingServer) {
      const loading = document.createElement('div');
      loading.style.cssText = 'text-align: center; padding: 40px; color: #888;';
      loading.textContent = 'Loading timeline...';
      container.appendChild(loading);
      return container;
    }

    const timelineLabel = document.createElement('h3');
    timelineLabel.textContent = '📅 Timeline';
    timelineLabel.style.cssText = 'margin: 0 0 15px 0; font-size: 16px; color: #aaa;';
    container.appendChild(timelineLabel);

    if (this.serverSnapshots.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding: 30px; text-align: center; color: #666;';
      empty.textContent = 'No snapshots available';
      container.appendChild(empty);
      return container;
    }

    const timeline = document.createElement('div');
    timeline.style.cssText = 'display: flex; flex-direction: column; gap: 10px; max-height: 350px; overflow-y: auto;';

    for (const snapshot of this.serverSnapshots) {
      const item = this.renderSnapshotItem(universe, snapshot);
      timeline.appendChild(item);
    }

    container.appendChild(timeline);
    return container;
  }

  private renderSnapshotItem(universe: ServerUniverse, snapshot: ServerSnapshot): HTMLElement {
    const item = document.createElement('div');
    const isCanonical = snapshot.type === 'canonical';

    item.style.cssText = `
      background: ${isCanonical ? 'rgba(255, 193, 7, 0.1)' : 'rgba(50, 50, 70, 0.5)'};
      border: 1px solid ${isCanonical ? 'rgba(255, 193, 7, 0.5)' : '#4a4a6a'};
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const date = new Date(snapshot.timestamp);
    const info = document.createElement('div');
    info.style.cssText = 'flex: 1;';

    if (isCanonical && snapshot.canonEvent) {
      info.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span style="font-size: 14px;">⭐</span>
          <span style="font-size: 14px; color: #ffc107; font-weight: bold;">${snapshot.canonEvent.title}</span>
        </div>
        <div style="font-size: 12px; color: #888;">
          Day ${snapshot.day} • Tick ${snapshot.tick} • ${date.toLocaleString()}
        </div>
        <div style="font-size: 11px; color: #aaa; margin-top: 4px;">${snapshot.canonEvent.description}</div>
      `;
    } else {
      const typeLabel = snapshot.type === 'auto' ? '🔄 Auto' : '💾 Manual';
      info.innerHTML = `
        <div style="font-size: 14px; color: #ccc; margin-bottom: 4px;">
          ${typeLabel} Save
        </div>
        <div style="font-size: 12px; color: #888;">
          Day ${snapshot.day} • Tick ${snapshot.tick} • ${date.toLocaleString()}
        </div>
      `;
    }
    item.appendChild(info);

    // Button container
    const buttons = document.createElement('div');
    buttons.style.cssText = 'display: flex; gap: 8px; flex-shrink: 0;';

    // Fork button (for canonical events, shown first)
    if (isCanonical) {
      const forkButton = document.createElement('button');
      forkButton.textContent = '🌿 Fork';
      forkButton.title = 'Create an alternate timeline from this point';
      forkButton.style.cssText = `
        padding: 8px 12px;
        font-size: 12px;
        font-family: monospace;
        background: linear-gradient(135deg, #8a6aaa 0%, #6a4a8a 100%);
        color: #fff;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: transform 0.1s;
      `;
      forkButton.onmouseover = () => { forkButton.style.transform = 'scale(1.05)'; };
      forkButton.onmouseout = () => { forkButton.style.transform = 'scale(1)'; };
      forkButton.onclick = (e) => {
        e.stopPropagation();
        this.handleForkUniverse(universe, snapshot);
      };
      buttons.appendChild(forkButton);
    }

    // Travel button
    const loadButton = document.createElement('button');
    loadButton.textContent = '⏱ Travel Here';
    loadButton.style.cssText = `
      padding: 8px 16px;
      font-size: 12px;
      font-family: monospace;
      background: ${isCanonical ? 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
      color: ${isCanonical ? '#000' : '#fff'};
      border: none;
      border-radius: 6px;
      cursor: pointer;
    `;
    loadButton.onclick = () => {
      if (this._onSelect) {
        this.hide();
        this._onSelect({
          action: 'load_server',
          universeId: universe.id,
          snapshotTick: snapshot.tick,
        });
      }
    };
    buttons.appendChild(loadButton);

    item.appendChild(buttons);

    return item;
  }

  /**
   * Handle forking a universe from a snapshot
   */
  private async handleForkUniverse(universe: ServerUniverse, snapshot: ServerSnapshot): Promise<void> {
    // Prompt for new universe name
    const baseName = universe.name.replace(/\s*\([^)]*\)\s*$/, ''); // Remove existing suffix
    const defaultName = `${baseName} (Alt Timeline @ Day ${snapshot.day})`;
    const newName = window.prompt('Name your alternate timeline:', defaultName);

    if (!newName) return; // User cancelled

    try {
      // Create fork via API
      const response = await fetch(`${this.API_BASE}/multiverse/universe/${universe.id}/fork`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshotTick: snapshot.tick,
          name: newName,
          ownerId: getPlayerId(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fork universe');
      }

      const result = await response.json();

      // Show success and ask if user wants to load the new universe
      const loadNow = window.confirm(
        `Alternate timeline "${newName}" created!\n\n` +
        `Would you like to travel to this timeline now?`
      );

      if (loadNow && this._onSelect) {
        this.hide();
        this._onSelect({
          action: 'load_server',
          universeId: result.universe.id,
          snapshotTick: snapshot.tick,
        });
      } else {
        // Refresh the universe list to show the new fork
        await this.loadServerUniverses();
      }
    } catch (error) {
      console.error('[UniverseBrowser] Fork failed:', error);
      window.alert(`Failed to create fork: ${(error as Error).message}`);
    }
  }

  destroy(): void {
    this.destroyTimelineView();
    this.container.remove();
  }
}
