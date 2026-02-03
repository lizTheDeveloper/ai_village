/**
 * PlanetJoinScreen - Preview species when joining an existing planet
 *
 * Shows the species that exist on a planet before entering the game.
 * Displays sprites that are ready and shows loading state for those generating.
 * Allows user to proceed to the game when ready.
 */

export interface JoinSpecies {
  id: string;
  name: string;
  type: 'animal' | 'plant' | 'agent' | 'other';
  biome?: string;
  spriteUrl?: string;
  spriteStatus: 'pending' | 'checking' | 'ready' | 'not_found';
  folderId: string;
}

export interface PlanetJoinCallbacks {
  onEnterPlanet: () => void;
  onBack: () => void;
}

// Biome icons and colors
const BIOME_CONFIG: Record<string, { icon: string; color: string }> = {
  forest: { icon: '🌲', color: '#228B22' },
  desert: { icon: '🏜️', color: '#DEB887' },
  ocean: { icon: '🌊', color: '#1E90FF' },
  tundra: { icon: '❄️', color: '#B0E0E6' },
  jungle: { icon: '🌴', color: '#32CD32' },
  savanna: { icon: '🦁', color: '#F4A460' },
  mountain: { icon: '⛰️', color: '#808080' },
  swamp: { icon: '🐊', color: '#556B2F' },
  volcanic: { icon: '🌋', color: '#FF4500' },
  cave: { icon: '🦇', color: '#2F4F4F' },
  coral_reef: { icon: '🐠', color: '#FF7F50' },
  grassland: { icon: '🌾', color: '#9ACD32' },
  plains: { icon: '🌾', color: '#9ACD32' },
  temperate: { icon: '🌳', color: '#228B22' },
  unknown: { icon: '🌍', color: '#666666' },
};

export class PlanetJoinScreen {
  private container: HTMLElement;
  private callbacks: PlanetJoinCallbacks;
  private planetName: string = '';
  private universeName: string = '';
  private species: JoinSpecies[] = [];
  private loading: boolean = true;
  private loadingMessage: string = 'Loading planet...';
  private spritesChecked: number = 0;
  private spritesReady: number = 0;

  private readonly METRICS_API = 'http://localhost:8766';

  constructor(containerId: string = 'planet-join-screen', callbacks: PlanetJoinCallbacks) {
    this.callbacks = callbacks;

    const existing = document.getElementById(containerId);
    if (existing) {
      this.container = existing;
    } else {
      this.container = document.createElement('div');
      this.container.id = containerId;
      this.container.className = 'planet-join-screen';
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

  show(planetName: string, universeName: string): void {
    this.planetName = planetName;
    this.universeName = universeName;
    this.loading = true;
    this.loadingMessage = 'Loading planet...';
    this.species = [];
    this.spritesChecked = 0;
    this.spritesReady = 0;
    this.container.style.display = 'flex';
    this.render();
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  /**
   * Set the species to display (called after snapshot is loaded)
   */
  setSpecies(speciesData: Array<{ name: string; type: string; biome?: string }>): void {
    this.species = speciesData.map(s => ({
      id: this.sanitizeFolderId(s.name),
      name: s.name,
      type: this.normalizeType(s.type),
      biome: s.biome || 'unknown',
      spriteStatus: 'pending' as const,
      folderId: this.sanitizeFolderId(s.name),
    }));
    this.loading = false;
    this.loadingMessage = '';
    this.render();

    // Start checking for sprites
    this.checkSprites();
  }

  /**
   * Update loading message
   */
  setLoadingMessage(message: string): void {
    this.loadingMessage = message;
    this.render();
  }

  /**
   * Mark loading as complete
   */
  setLoadingComplete(): void {
    this.loading = false;
    this.render();
  }

  private normalizeType(type: string): 'animal' | 'plant' | 'agent' | 'other' {
    const t = type.toLowerCase();
    if (t === 'animal' || t === 'creature') return 'animal';
    if (t === 'plant' || t === 'flora') return 'plant';
    if (t === 'agent' || t === 'human' || t === 'humanoid') return 'agent';
    return 'other';
  }

  private sanitizeFolderId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  /**
   * Check sprite status for all species
   */
  private async checkSprites(): Promise<void> {
    for (const s of this.species) {
      s.spriteStatus = 'checking';
    }
    this.render();

    // Check sprites in parallel batches of 5
    const batchSize = 5;
    for (let i = 0; i < this.species.length; i += batchSize) {
      const batch = this.species.slice(i, i + batchSize);
      await Promise.all(batch.map(s => this.checkSpriteStatus(s)));
      this.render();
    }
  }

  private async checkSpriteStatus(species: JoinSpecies): Promise<void> {
    try {
      // Try to fetch the sprite directly
      const spriteUrl = `${this.METRICS_API}/api/sprites/${species.folderId}/south.png`;
      const response = await fetch(spriteUrl, { method: 'HEAD' });

      if (response.ok) {
        species.spriteUrl = spriteUrl;
        species.spriteStatus = 'ready';
        this.spritesReady++;
      } else {
        species.spriteStatus = 'not_found';
      }
    } catch {
      species.spriteStatus = 'not_found';
    }
    this.spritesChecked++;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes float-in {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `;
    this.container.appendChild(style);

    // Header
    this.container.appendChild(this.renderHeader());

    // Main content
    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      padding: 20px 40px 40px 40px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    `;

    if (this.loading) {
      content.appendChild(this.renderLoading());
    } else {
      content.appendChild(this.renderSpeciesGrid());
    }

    this.container.appendChild(content);
  }

  private renderHeader(): HTMLElement {
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 25px 40px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    // Left side - title and info
    const left = document.createElement('div');

    const title = document.createElement('h1');
    title.textContent = `🪐 ${this.planetName}`;
    title.style.cssText = 'margin: 0; font-size: 28px; color: #fff;';
    left.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.textContent = `in ${this.universeName}`;
    subtitle.style.cssText = 'font-size: 14px; color: #888; margin-top: 5px;';
    left.appendChild(subtitle);

    if (!this.loading && this.species.length > 0) {
      const stats = document.createElement('div');
      stats.style.cssText = 'font-size: 12px; color: #4CAF50; margin-top: 8px;';
      stats.textContent = `${this.species.length} species discovered • ${this.spritesReady} sprites ready`;
      left.appendChild(stats);
    }

    header.appendChild(left);

    // Right side - action buttons
    const right = document.createElement('div');
    right.style.cssText = 'display: flex; gap: 15px;';

    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back';
    backBtn.style.cssText = `
      padding: 12px 24px;
      font-size: 14px;
      font-family: monospace;
      background: transparent;
      color: #888;
      border: 1px solid #3a3a5a;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    `;
    backBtn.onmouseenter = () => { backBtn.style.borderColor = '#667eea'; backBtn.style.color = '#fff'; };
    backBtn.onmouseleave = () => { backBtn.style.borderColor = '#3a3a5a'; backBtn.style.color = '#888'; };
    backBtn.onclick = () => this.callbacks.onBack();
    right.appendChild(backBtn);

    const enterBtn = document.createElement('button');
    enterBtn.textContent = '👁️ Enter as Deity';
    enterBtn.disabled = this.loading;
    enterBtn.style.cssText = `
      padding: 14px 28px;
      font-size: 16px;
      font-family: monospace;
      font-weight: bold;
      background: ${this.loading ? '#444' : 'linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)'};
      color: ${this.loading ? '#888' : '#000'};
      border: none;
      border-radius: 8px;
      cursor: ${this.loading ? 'default' : 'pointer'};
      transition: all 0.2s;
      box-shadow: ${this.loading ? 'none' : '0 0 30px rgba(255, 215, 0, 0.3)'};
    `;
    if (!this.loading) {
      enterBtn.onmouseenter = () => {
        enterBtn.style.transform = 'scale(1.05)';
        enterBtn.style.boxShadow = '0 0 50px rgba(255, 215, 0, 0.5)';
      };
      enterBtn.onmouseleave = () => {
        enterBtn.style.transform = 'scale(1)';
        enterBtn.style.boxShadow = '0 0 30px rgba(255, 215, 0, 0.3)';
      };
      enterBtn.onclick = () => this.callbacks.onEnterPlanet();
    }
    right.appendChild(enterBtn);

    header.appendChild(right);

    return header;
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
      <div style="font-size: 72px; margin-bottom: 30px; animation: pulse 1.5s ease-in-out infinite;">🌍</div>
      <div style="font-size: 20px; color: #fff; margin-bottom: 10px;">Joining Planet</div>
      <div style="font-size: 14px; color: #888;">${this.loadingMessage}</div>
    `;
    return loading;
  }

  private renderSpeciesGrid(): HTMLElement {
    const container = document.createElement('div');

    if (this.species.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align: center; padding: 60px; color: #666;';
      empty.innerHTML = `
        <div style="font-size: 64px; margin-bottom: 20px;">🔭</div>
        <div style="font-size: 18px;">No species data found</div>
        <div style="font-size: 14px; color: #555; margin-top: 10px;">The planet awaits exploration!</div>
      `;
      container.appendChild(empty);
      return container;
    }

    // Group by biome
    const biomeGroups = new Map<string, JoinSpecies[]>();
    for (const s of this.species) {
      const biome = s.biome || 'unknown';
      if (!biomeGroups.has(biome)) {
        biomeGroups.set(biome, []);
      }
      biomeGroups.get(biome)!.push(s);
    }

    // Render biome sections
    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px;';

    for (const [biomeName, biomeSpecies] of biomeGroups) {
      grid.appendChild(this.renderBiomeCard(biomeName, biomeSpecies));
    }

    container.appendChild(grid);
    return container;
  }

  private renderBiomeCard(biomeName: string, biomeSpecies: JoinSpecies[]): HTMLElement {
    const config = BIOME_CONFIG[biomeName.toLowerCase()] ?? { icon: '🌍', color: '#666666' };

    const card = document.createElement('div');
    card.style.cssText = `
      background: rgba(30, 30, 50, 0.8);
      border: 1px solid #3a3a5a;
      border-radius: 12px;
      overflow: hidden;
      animation: float-in 0.3s ease-out;
    `;

    // Biome header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 15px 20px;
      background: linear-gradient(135deg, ${config.color}22 0%, ${config.color}11 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    header.innerHTML = `
      <span style="font-size: 24px;">${config.icon}</span>
      <span style="font-size: 16px; color: ${config.color}; font-weight: bold; text-transform: capitalize;">${biomeName}</span>
      <span style="font-size: 12px; color: #888; margin-left: auto;">${biomeSpecies.length} species</span>
    `;
    card.appendChild(header);

    // Species list
    const list = document.createElement('div');
    list.style.cssText = 'padding: 15px; display: flex; flex-wrap: wrap; gap: 12px;';

    for (const s of biomeSpecies) {
      list.appendChild(this.renderSpeciesItem(s));
    }

    card.appendChild(list);
    return card;
  }

  private renderSpeciesItem(species: JoinSpecies): HTMLElement {
    const item = document.createElement('div');
    item.style.cssText = `
      width: 70px;
      text-align: center;
    `;

    // Sprite container
    const spriteContainer = document.createElement('div');
    spriteContainer.style.cssText = `
      width: 64px;
      height: 64px;
      margin: 0 auto 8px auto;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: 2px solid ${species.spriteStatus === 'ready' ? '#4CAF50' : '#3a3a5a'};
    `;

    if (species.spriteStatus === 'ready' && species.spriteUrl) {
      const img = document.createElement('img');
      img.src = species.spriteUrl;
      img.alt = species.name;
      img.style.cssText = 'max-width: 100%; max-height: 100%; image-rendering: pixelated;';
      img.onerror = () => {
        spriteContainer.innerHTML = this.getTypeEmoji(species.type);
        spriteContainer.style.fontSize = '28px';
      };
      spriteContainer.appendChild(img);
    } else if (species.spriteStatus === 'checking' || species.spriteStatus === 'pending') {
      spriteContainer.style.background = 'linear-gradient(90deg, rgba(60,60,80,0.8) 0%, rgba(80,80,100,0.8) 50%, rgba(60,60,80,0.8) 100%)';
      spriteContainer.style.backgroundSize = '200% 100%';
      spriteContainer.style.animation = 'shimmer 1.5s infinite linear';
      spriteContainer.innerHTML = '<span style="color: #888; font-size: 10px;">...</span>';
    } else {
      // Not found - show emoji
      spriteContainer.innerHTML = `<span style="font-size: 28px;">${this.getTypeEmoji(species.type)}</span>`;
    }

    item.appendChild(spriteContainer);

    // Name
    const name = document.createElement('div');
    name.textContent = species.name;
    name.style.cssText = `
      font-size: 10px;
      color: #aaa;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;
    name.title = species.name;
    item.appendChild(name);

    return item;
  }

  private getTypeEmoji(type: string): string {
    switch (type) {
      case 'animal': return '🦌';
      case 'plant': return '🌿';
      case 'agent': return '👤';
      default: return '❓';
    }
  }

  destroy(): void {
    this.container.remove();
  }
}
