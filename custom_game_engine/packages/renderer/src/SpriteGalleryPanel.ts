/**
 * SpriteGalleryPanel - Browse and manage game sprites
 *
 * Features:
 * - Shows all PixelLab sprites from assets
 * - Highlights sprites currently loaded in-game
 * - Direction controls for viewing different angles
 * - Regeneration via PixelLab API
 * - Search and category filtering
 */

import type { IWindowPanel } from './types/WindowTypes.js';
import type { PixelLabSpriteLoader } from './sprites/PixelLabSpriteLoader.js';

const DIRECTIONS = ['south', 'southwest', 'west', 'northwest', 'north', 'northeast', 'east', 'southeast'];
const METRICS_API = 'http://localhost:8766';

interface SpriteInfo {
  id: string;
  baseId: string;
  category: string;
  description: string;
  hasImage: boolean;
  versions: Array<{ version: string; folderId: string; active: boolean }>;
  artStyle?: string;
}

export class SpriteGalleryPanel implements IWindowPanel {
  private visible: boolean = false;
  private container: HTMLDivElement;
  private contentContainer: HTMLDivElement;
  private spriteLoader: PixelLabSpriteLoader | null = null;

  private allSprites: SpriteInfo[] = [];
  private filteredSprites: SpriteInfo[] = [];
  private loadedSpriteIds: Set<string> = new Set();
  private spriteDirections: Map<string, number> = new Map();
  private searchTerm: string = '';
  private categoryFilter: string = '';
  private showOnlyLoaded: boolean = false;
  private isLoading: boolean = false;
  private lastError: string | null = null;

  private scrollTop: number = 0;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'sprite-gallery-panel';
    this.setupStyles();
    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'sprite-gallery-content';
    this.container.appendChild(this.contentContainer);
    document.body.appendChild(this.container);

    // Initial load
    this.loadSprites();
  }

  getId(): string {
    return 'sprite-gallery';
  }

  getTitle(): string {
    return 'Sprite Gallery';
  }

  getDefaultWidth(): number {
    return 800;
  }

  getDefaultHeight(): number {
    return 600;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.container.style.display = visible ? 'block' : 'none';
    if (visible) {
      this.updateLoadedSprites();
      this.renderContent();
    }
  }

  /**
   * Set the sprite loader to track which sprites are loaded in-game
   */
  setSpriteLoader(loader: PixelLabSpriteLoader): void {
    this.spriteLoader = loader;
    this.updateLoadedSprites();
  }

  private setupStyles(): void {
    // Inject CSS if not already present
    if (!document.getElementById('sprite-gallery-styles')) {
      const style = document.createElement('style');
      style.id = 'sprite-gallery-styles';
      style.textContent = `
        .sprite-gallery-panel {
          position: fixed;
          display: none;
          pointer-events: none;
        }

        .sprite-gallery-content {
          background: #0d1117;
          color: #c9d1d9;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
          height: 100%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          pointer-events: auto;
        }

        .sprite-gallery-toolbar {
          padding: 12px;
          background: #161b22;
          border-bottom: 1px solid #30363d;
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .sprite-gallery-toolbar input,
        .sprite-gallery-toolbar select {
          padding: 6px 10px;
          background: #21262d;
          border: 1px solid #30363d;
          color: #c9d1d9;
          border-radius: 4px;
          font-size: 13px;
        }

        .sprite-gallery-toolbar input:focus,
        .sprite-gallery-toolbar select:focus {
          outline: none;
          border-color: #58a6ff;
        }

        .sprite-gallery-toolbar input {
          flex: 1;
          min-width: 150px;
        }

        .sprite-gallery-toolbar label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #8b949e;
          cursor: pointer;
        }

        .sprite-gallery-toolbar .sprite-count {
          font-size: 13px;
          color: #8b949e;
          margin-left: auto;
        }

        .sprite-gallery-grid {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
          align-content: start;
        }

        .sprite-card {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 12px;
          transition: all 0.2s;
        }

        .sprite-card:hover {
          border-color: #58a6ff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .sprite-card.loaded {
          border-color: #3fb950;
          background: #0d1117;
        }

        .sprite-card.loaded::before {
          content: '● IN GAME';
          position: absolute;
          top: 8px;
          left: 8px;
          font-size: 9px;
          color: #3fb950;
          font-weight: 600;
        }

        .sprite-card {
          position: relative;
        }

        .sprite-preview {
          width: 100%;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%) 50% / 16px 16px;
          border-radius: 4px;
          margin-bottom: 10px;
          position: relative;
          overflow: hidden;
        }

        .sprite-preview img {
          image-rendering: pixelated;
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .sprite-preview .no-image {
          color: #8b949e;
          font-size: 12px;
        }

        .direction-indicator {
          position: absolute;
          top: 4px;
          right: 4px;
          background: rgba(0, 0, 0, 0.7);
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 10px;
          text-transform: uppercase;
          color: #8b949e;
        }

        .direction-controls {
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 2px;
          background: rgba(0, 0, 0, 0.7);
          padding: 2px 4px;
          border-radius: 3px;
        }

        .direction-btn {
          background: #21262d;
          border: 1px solid #30363d;
          color: #c9d1d9;
          padding: 2px 6px;
          border-radius: 2px;
          cursor: pointer;
          font-size: 10px;
        }

        .direction-btn:hover {
          background: #58a6ff;
          border-color: #58a6ff;
        }

        .sprite-info {
          margin-bottom: 8px;
        }

        .sprite-id {
          font-size: 13px;
          font-weight: 600;
          color: #58a6ff;
          margin-bottom: 2px;
          word-break: break-word;
        }

        .sprite-category {
          font-size: 10px;
          color: #8b949e;
          text-transform: uppercase;
        }

        .sprite-description {
          font-size: 11px;
          color: #8b949e;
          margin-top: 4px;
          line-height: 1.3;
          max-height: 40px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sprite-actions {
          display: flex;
          gap: 6px;
          margin-top: 8px;
        }

        .sprite-btn {
          flex: 1;
          padding: 6px 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 500;
          transition: background 0.2s;
        }

        .sprite-btn-regenerate {
          background: #a371f7;
          color: white;
        }

        .sprite-btn-regenerate:hover {
          background: #9775dd;
        }

        .sprite-btn-load {
          background: #238636;
          color: white;
        }

        .sprite-btn-load:hover {
          background: #2ea043;
        }

        .sprite-gallery-loading,
        .sprite-gallery-error {
          padding: 40px;
          text-align: center;
          color: #8b949e;
        }

        .sprite-gallery-error {
          color: #f85149;
        }

        .btn-refresh {
          background: #21262d;
          border: 1px solid #30363d;
          color: #c9d1d9;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
        }

        .btn-refresh:hover {
          background: #30363d;
        }
      `;
      document.head.appendChild(style);
    }
  }

  private updateLoadedSprites(): void {
    this.loadedSpriteIds.clear();
    if (this.spriteLoader) {
      const loaded = this.spriteLoader.getLoadedCharacterIds();
      for (const id of loaded) {
        this.loadedSpriteIds.add(id);
      }
    }
  }

  private async loadSprites(): Promise<void> {
    this.isLoading = true;
    this.lastError = null;
    this.renderContent();

    try {
      const response = await fetch(`${METRICS_API}/api/pixellab/sprites`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      this.allSprites = data.sprites || [];
      this.filterSprites();
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Unknown error';
      console.error('[SpriteGalleryPanel] Failed to load sprites:', err);
    } finally {
      this.isLoading = false;
      this.renderContent();
    }
  }

  private filterSprites(): void {
    const search = this.searchTerm.toLowerCase();
    this.filteredSprites = this.allSprites.filter(sprite => {
      // Search filter
      const matchesSearch = !search ||
        sprite.id.toLowerCase().includes(search) ||
        sprite.description.toLowerCase().includes(search);

      // Category filter
      const matchesCategory = !this.categoryFilter || sprite.category === this.categoryFilter;

      // Loaded filter
      const matchesLoaded = !this.showOnlyLoaded || this.loadedSpriteIds.has(sprite.id);

      return matchesSearch && matchesCategory && matchesLoaded;
    });
  }

  private getCategories(): string[] {
    const categories = new Set<string>();
    for (const sprite of this.allSprites) {
      if (sprite.category) {
        categories.add(sprite.category);
      }
    }
    return Array.from(categories).sort();
  }

  private changeDirection(spriteId: string, delta: number): void {
    const currentIdx = this.spriteDirections.get(spriteId) || 0;
    const newIdx = (currentIdx + delta + DIRECTIONS.length) % DIRECTIONS.length;
    this.spriteDirections.set(spriteId, newIdx);

    const direction = DIRECTIONS[newIdx] || 'south';

    // Update just the image and direction text
    const img = document.querySelector(`#sprite-${CSS.escape(spriteId)} img`) as HTMLImageElement;
    const indicator = document.querySelector(`#sprite-${CSS.escape(spriteId)} .direction-indicator`);
    if (img) {
      img.src = `${METRICS_API}/api/sprites/${spriteId}/${direction}.png`;
    }
    if (indicator) {
      indicator.textContent = direction;
    }
  }

  private async regenerateSprite(spriteId: string, description: string): Promise<void> {
    if (!confirm(`Regenerate "${spriteId}"?\n\nCurrent version will be saved as a backup.`)) {
      return;
    }

    try {
      const response = await fetch(`${METRICS_API}/api/pixellab/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: spriteId, description }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Queued regeneration!\n\nOld version saved as: ${result.versionedAs}\nNew sprite queued: ${result.queuedNew}`);
        // Reload after a short delay
        setTimeout(() => this.loadSprites(), 1000);
      } else {
        alert(`Error: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  private async loadSpriteInGame(spriteId: string): Promise<void> {
    if (!this.spriteLoader) {
      alert('Sprite loader not available');
      return;
    }

    try {
      await this.spriteLoader.loadCharacter(spriteId);
      this.updateLoadedSprites();
      this.renderContent();
    } catch (err) {
      alert(`Failed to load sprite: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  private renderContent(): void {
    // Build HTML
    let html = '';

    // Toolbar
    html += `
      <div class="sprite-gallery-toolbar">
        <input type="text" id="sg-search" placeholder="Search sprites..." value="${this.escapeHtml(this.searchTerm)}">
        <select id="sg-category">
          <option value="">All Categories</option>
          ${this.getCategories().map(cat =>
            `<option value="${this.escapeHtml(cat)}" ${cat === this.categoryFilter ? 'selected' : ''}>${this.escapeHtml(cat)}</option>`
          ).join('')}
        </select>
        <label>
          <input type="checkbox" id="sg-loaded-only" ${this.showOnlyLoaded ? 'checked' : ''}>
          In-game only
        </label>
        <button class="btn-refresh" id="sg-refresh">Refresh</button>
        <span class="sprite-count">${this.filteredSprites.length} sprites${this.loadedSpriteIds.size > 0 ? ` (${this.loadedSpriteIds.size} loaded)` : ''}</span>
      </div>
    `;

    // Content
    if (this.isLoading) {
      html += `<div class="sprite-gallery-loading">Loading sprites...</div>`;
    } else if (this.lastError) {
      html += `<div class="sprite-gallery-error">Error: ${this.escapeHtml(this.lastError)}<br><br>Make sure the metrics server is running at ${METRICS_API}</div>`;
    } else if (this.filteredSprites.length === 0) {
      html += `<div class="sprite-gallery-loading">No sprites found</div>`;
    } else {
      html += `<div class="sprite-gallery-grid">`;
      for (const sprite of this.filteredSprites) {
        const isLoaded = this.loadedSpriteIds.has(sprite.id);
        const dirIdx = this.spriteDirections.get(sprite.id) || 0;
        const direction = DIRECTIONS[dirIdx];
        const imgSrc = sprite.hasImage
          ? `${METRICS_API}/api/sprites/${sprite.id}/${direction}.png`
          : '';

        html += `
          <div class="sprite-card ${isLoaded ? 'loaded' : ''}" id="sprite-${this.escapeHtml(sprite.id)}">
            <div class="sprite-preview">
              ${sprite.hasImage
                ? `<img src="${imgSrc}" alt="${this.escapeHtml(sprite.id)}" loading="lazy">`
                : `<span class="no-image">No preview</span>`
              }
              ${sprite.hasImage ? `<div class="direction-indicator">${direction}</div>` : ''}
              ${sprite.hasImage ? `
                <div class="direction-controls">
                  <button class="direction-btn" data-sprite="${this.escapeHtml(sprite.id)}" data-dir="-1">◀</button>
                  <button class="direction-btn" data-sprite="${this.escapeHtml(sprite.id)}" data-dir="1">▶</button>
                </div>
              ` : ''}
            </div>
            <div class="sprite-info">
              <div class="sprite-id">${this.escapeHtml(sprite.id)}</div>
              <div class="sprite-category">${this.escapeHtml(sprite.category)}</div>
              ${sprite.description ? `<div class="sprite-description">${this.escapeHtml(sprite.description)}</div>` : ''}
            </div>
            <div class="sprite-actions">
              ${!isLoaded ? `<button class="sprite-btn sprite-btn-load" data-action="load" data-sprite="${this.escapeHtml(sprite.id)}">Load</button>` : ''}
              <button class="sprite-btn sprite-btn-regenerate" data-action="regenerate" data-sprite="${this.escapeHtml(sprite.id)}" data-description="${this.escapeHtml(sprite.description)}">Regenerate</button>
            </div>
          </div>
        `;
      }
      html += `</div>`;
    }

    this.contentContainer.innerHTML = html;

    // Attach event handlers
    this.attachEventHandlers();
  }

  private attachEventHandlers(): void {
    // Search input
    const searchInput = this.contentContainer.querySelector('#sg-search') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.searchTerm = searchInput.value;
        this.filterSprites();
        this.renderContent();
      });
    }

    // Category filter
    const categorySelect = this.contentContainer.querySelector('#sg-category') as HTMLSelectElement;
    if (categorySelect) {
      categorySelect.addEventListener('change', () => {
        this.categoryFilter = categorySelect.value;
        this.filterSprites();
        this.renderContent();
      });
    }

    // Loaded only checkbox
    const loadedCheckbox = this.contentContainer.querySelector('#sg-loaded-only') as HTMLInputElement;
    if (loadedCheckbox) {
      loadedCheckbox.addEventListener('change', () => {
        this.showOnlyLoaded = loadedCheckbox.checked;
        this.filterSprites();
        this.renderContent();
      });
    }

    // Refresh button
    const refreshBtn = this.contentContainer.querySelector('#sg-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadSprites();
      });
    }

    // Direction buttons
    this.contentContainer.querySelectorAll('.direction-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const spriteId = target.dataset.sprite;
        const delta = parseInt(target.dataset.dir || '0', 10);
        if (spriteId) {
          this.changeDirection(spriteId, delta);
        }
      });
    });

    // Action buttons
    this.contentContainer.querySelectorAll('.sprite-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const action = target.dataset.action;
        const spriteId = target.dataset.sprite;
        const description = target.dataset.description || '';

        if (action === 'load' && spriteId) {
          this.loadSpriteInGame(spriteId);
        } else if (action === 'regenerate' && spriteId) {
          this.regenerateSprite(spriteId, description);
        }
      });
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // IWindowPanel render method - positions the DOM container
  render(
    _ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    _world?: unknown
  ): void {
    // Position the DOM container to match the window position
    this.container.style.left = `${x}px`;
    this.container.style.top = `${y}px`;
    this.container.style.width = `${width}px`;
    this.container.style.height = `${height}px`;

    // Update loaded sprites periodically
    if (this.visible && this.spriteLoader) {
      this.updateLoadedSprites();
    }
  }

  handleScroll(deltaY: number, _contentHeight: number): boolean {
    const grid = this.contentContainer.querySelector('.sprite-gallery-grid');
    if (grid) {
      grid.scrollTop += deltaY;
      return true;
    }
    return false;
  }

  handleContentClick(_x: number, _y: number, _width: number, _height: number): boolean {
    // DOM handles its own clicks
    return true;
  }

  /**
   * Cleanup DOM elements
   */
  destroy(): void {
    this.container.remove();
  }
}
