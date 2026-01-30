/**
 * PlanetListScreen - Browse and join planets within a universe
 *
 * Shows all planets in a selected universe.
 * Users can join an existing planet or create a new one.
 */

export interface ServerPlanetInfo {
  id: string;
  universeId: string;
  name: string;
  type: string;
  artStyle: string;
  speciesCount: number;
  playerCount: number;
  biomes: string[];
  createdAt: number;
  createdBy: string;
  isGenerating: boolean;
  generationProgress?: number;
}

export interface UniverseDetails {
  id: string;
  name: string;
  magicPreset: string;
  magicIntensity: string;
  cosmicDeities: string[];
}

export interface PlanetListCallbacks {
  onJoinPlanet: (planetId: string) => void;
  onCreatePlanet: (universeId: string) => void;
  onBack: () => void;
}

export class PlanetListScreen {
  private container: HTMLElement;
  private callbacks: PlanetListCallbacks;
  private universeId: string;
  private universe: UniverseDetails | null = null;
  private planets: ServerPlanetInfo[] = [];
  private loading: boolean = false;
  private error: string | null = null;

  private readonly API_BASE = 'http://localhost:3001/api';

  constructor(containerId: string = 'planet-list-screen', callbacks: PlanetListCallbacks) {
    this.callbacks = callbacks;
    this.universeId = '';

    const existing = document.getElementById(containerId);
    if (existing) {
      this.container = existing;
    } else {
      this.container = document.createElement('div');
      this.container.id = containerId;
      this.container.className = 'planet-list-screen';
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

  async show(universeId: string): Promise<void> {
    this.universeId = universeId;
    this.container.style.display = 'flex';
    await this.loadData();
    this.render();
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  private async loadData(): Promise<void> {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      // Load universe details
      const universeRes = await fetch(`${this.API_BASE}/multiverse/universe/${this.universeId}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!universeRes.ok) throw new Error('Failed to load universe');
      const universeData = await universeRes.json();
      this.universe = {
        id: universeData.universe.id,
        name: universeData.universe.name,
        magicPreset: universeData.universe.magicPreset || 'Unknown',
        magicIntensity: universeData.universe.magicIntensity || 'medium',
        cosmicDeities: universeData.universe.cosmicDeities || [],
      };

      // Load planets
      const planetsRes = await fetch(`${this.API_BASE}/multiverse/universe/${this.universeId}/planets`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!planetsRes.ok) throw new Error('Failed to load planets');
      const planetsData = await planetsRes.json();
      this.planets = (planetsData.planets || []).map((p: any) => ({
        id: p.id,
        universeId: p.universeId,
        name: p.name,
        type: p.type || 'terrestrial',
        artStyle: p.artStyle || 'unknown',
        speciesCount: p.speciesCount || 0,
        playerCount: p.playerCount || 0,
        biomes: p.biomes || [],
        createdAt: p.createdAt,
        createdBy: p.createdBy || 'Unknown',
        isGenerating: p.isGenerating || false,
        generationProgress: p.generationProgress,
      }));

      // Sort by creation date, newest first
      this.planets.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('[PlanetList] Failed to load data:', error);
      this.error = (error as Error).message;
    } finally {
      this.loading = false;
      this.render();
    }
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
      @keyframes generating-pulse {
        0%, 100% { border-color: #ff9800; box-shadow: 0 0 10px rgba(255, 152, 0, 0.3); }
        50% { border-color: #ffb74d; box-shadow: 0 0 20px rgba(255, 152, 0, 0.5); }
      }
    `;
    this.container.appendChild(style);

    // Header
    this.container.appendChild(this.renderHeader());

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
      // Universe info banner
      if (this.universe) {
        content.appendChild(this.renderUniverseBanner());
      }
      content.appendChild(this.renderPlanetGrid());
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
    backBtn.textContent = '← Back to Universes';
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
    title.textContent = this.universe ? `🪐 ${this.universe.name}` : '🪐 Planets';
    title.style.cssText = `
      margin: 0;
      font-size: 28px;
      font-weight: normal;
      color: #fff;
      text-shadow: 0 0 20px rgba(255, 152, 0, 0.3);
    `;
    left.appendChild(title);

    header.appendChild(left);

    // Right side - create button
    const createBtn = document.createElement('button');
    createBtn.textContent = '🌍 Create New Planet';
    createBtn.style.cssText = `
      padding: 14px 28px;
      font-size: 16px;
      font-family: monospace;
      background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    `;
    createBtn.onmouseenter = () => {
      createBtn.style.transform = 'scale(1.05)';
      createBtn.style.boxShadow = '0 0 30px rgba(255, 152, 0, 0.4)';
    };
    createBtn.onmouseleave = () => {
      createBtn.style.transform = 'scale(1)';
      createBtn.style.boxShadow = 'none';
    };
    createBtn.onclick = () => this.callbacks.onCreatePlanet(this.universeId);
    header.appendChild(createBtn);

    return header;
  }

  private renderUniverseBanner(): HTMLElement {
    const banner = document.createElement('div');
    banner.style.cssText = `
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      border: 1px solid rgba(102, 126, 234, 0.3);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 25px;
      display: flex;
      gap: 30px;
      flex-wrap: wrap;
    `;

    const magicSection = document.createElement('div');
    magicSection.innerHTML = `
      <div style="font-size: 12px; color: #888; margin-bottom: 4px;">Magic System</div>
      <div style="font-size: 14px; color: #9999ff;">
        ${this.universe!.magicPreset} (${this.universe!.magicIntensity})
      </div>
    `;
    banner.appendChild(magicSection);

    if (this.universe!.cosmicDeities.length > 0) {
      const deitiesSection = document.createElement('div');
      deitiesSection.innerHTML = `
        <div style="font-size: 12px; color: #888; margin-bottom: 4px;">Cosmic Deities</div>
        <div style="font-size: 14px; color: #c8a8e8;">
          ${this.universe!.cosmicDeities.join(', ')}
        </div>
      `;
      banner.appendChild(deitiesSection);
    }

    const statsSection = document.createElement('div');
    statsSection.style.cssText = 'margin-left: auto;';
    statsSection.innerHTML = `
      <div style="font-size: 12px; color: #888; margin-bottom: 4px;">Planets</div>
      <div style="font-size: 24px; color: #ff9800; font-weight: bold;">
        ${this.planets.length}
      </div>
    `;
    banner.appendChild(statsSection);

    return banner;
  }

  private renderPlanetGrid(): HTMLElement {
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    `;

    if (this.planets.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = `
        grid-column: 1 / -1;
        text-align: center;
        padding: 80px 20px;
        color: #666;
      `;
      empty.innerHTML = `
        <div style="font-size: 64px; margin-bottom: 20px; opacity: 0.5;">🪐</div>
        <div style="font-size: 18px; margin-bottom: 10px;">No planets yet</div>
        <div style="font-size: 14px; color: #555;">Be the first to create a planet in this universe!</div>
      `;
      grid.appendChild(empty);
      return grid;
    }

    this.planets.forEach((planet, index) => {
      grid.appendChild(this.renderPlanetCard(planet, index));
    });

    return grid;
  }

  private renderPlanetCard(planet: ServerPlanetInfo, index: number): HTMLElement {
    const card = document.createElement('div');
    card.style.cssText = `
      background: rgba(30, 30, 50, 0.8);
      border: 2px solid ${planet.isGenerating ? '#ff9800' : '#3a3a5a'};
      border-radius: 12px;
      padding: 20px;
      cursor: ${planet.isGenerating ? 'default' : 'pointer'};
      transition: all 0.2s;
      animation: float-in 0.3s ease-out ${index * 0.05}s both;
      ${planet.isGenerating ? 'animation: generating-pulse 2s ease-in-out infinite;' : ''}
    `;

    if (!planet.isGenerating) {
      card.onmouseenter = () => {
        card.style.borderColor = '#ff9800';
        card.style.transform = 'translateY(-4px)';
        card.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
      };
      card.onmouseleave = () => {
        card.style.borderColor = '#3a3a5a';
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = 'none';
      };
      card.onclick = () => this.callbacks.onJoinPlanet(planet.id);
    }

    // Planet type icons
    const typeIcons: Record<string, string> = {
      terrestrial: '🌍', desert: '🏜️', ice: '❄️', ocean: '🌊',
      volcanic: '🌋', magical: '✨', fungal: '🍄', crystal: '💎',
      gas_giant: '🪐', super_earth: '🏔️',
    };

    // Header row
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display: flex; align-items: center; gap: 12px; margin-bottom: 12px;';

    const icon = document.createElement('span');
    icon.textContent = typeIcons[planet.type] || '🪐';
    icon.style.cssText = 'font-size: 32px;';
    headerRow.appendChild(icon);

    const nameWrapper = document.createElement('div');
    nameWrapper.style.cssText = 'flex: 1;';

    const name = document.createElement('div');
    name.textContent = planet.name;
    name.style.cssText = 'font-size: 18px; font-weight: bold; color: #fff;';
    nameWrapper.appendChild(name);

    const type = document.createElement('div');
    type.textContent = `${planet.type} planet`;
    type.style.cssText = 'font-size: 12px; color: #888; text-transform: capitalize;';
    nameWrapper.appendChild(type);

    headerRow.appendChild(nameWrapper);

    if (planet.isGenerating) {
      const genBadge = document.createElement('span');
      genBadge.textContent = 'Generating...';
      genBadge.style.cssText = `
        padding: 4px 10px;
        font-size: 10px;
        font-weight: bold;
        background: rgba(255, 152, 0, 0.2);
        color: #ff9800;
        border-radius: 12px;
        animation: pulse 1s ease-in-out infinite;
      `;
      headerRow.appendChild(genBadge);
    }

    card.appendChild(headerRow);

    // Generation progress
    if (planet.isGenerating && planet.generationProgress !== undefined) {
      const progressBar = document.createElement('div');
      progressBar.style.cssText = `
        width: 100%;
        height: 6px;
        background: rgba(255, 152, 0, 0.2);
        border-radius: 3px;
        margin-bottom: 12px;
        overflow: hidden;
      `;
      const progressFill = document.createElement('div');
      progressFill.style.cssText = `
        width: ${planet.generationProgress}%;
        height: 100%;
        background: linear-gradient(90deg, #ff9800, #ffb74d);
        transition: width 0.3s;
      `;
      progressBar.appendChild(progressFill);
      card.appendChild(progressBar);
    }

    // Art style
    const artStyle = document.createElement('div');
    artStyle.style.cssText = 'margin-bottom: 12px;';
    artStyle.innerHTML = `
      <div style="font-size: 12px; color: #888; margin-bottom: 2px;">Art Style</div>
      <div style="font-size: 13px; color: #aaa;">${planet.artStyle}</div>
    `;
    card.appendChild(artStyle);

    // Biomes
    if (planet.biomes.length > 0) {
      const biomes = document.createElement('div');
      biomes.style.cssText = 'margin-bottom: 12px;';
      biomes.innerHTML = `
        <div style="font-size: 12px; color: #888; margin-bottom: 4px;">Biomes</div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          ${planet.biomes.slice(0, 5).map(b => `
            <span style="
              padding: 3px 8px;
              font-size: 11px;
              background: rgba(100, 150, 100, 0.2);
              color: #8fdf8f;
              border-radius: 10px;
            ">${b}</span>
          `).join('')}
          ${planet.biomes.length > 5 ? `<span style="font-size: 11px; color: #666;">+${planet.biomes.length - 5}</span>` : ''}
        </div>
      `;
      card.appendChild(biomes);
    }

    // Stats row
    const stats = document.createElement('div');
    stats.style.cssText = 'display: flex; gap: 20px; font-size: 12px; color: #888; margin-top: 15px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);';
    stats.innerHTML = `
      <span>🦎 ${planet.speciesCount} species</span>
      <span>👥 ${planet.playerCount} playing</span>
    `;
    card.appendChild(stats);

    // Join button (if not generating)
    if (!planet.isGenerating) {
      const joinBtn = document.createElement('button');
      joinBtn.textContent = '▶ Join Planet';
      joinBtn.style.cssText = `
        width: 100%;
        margin-top: 15px;
        padding: 12px;
        font-size: 14px;
        font-family: monospace;
        font-weight: bold;
        background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
        color: #fff;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: transform 0.2s;
      `;
      joinBtn.onmouseenter = () => { joinBtn.style.transform = 'scale(1.02)'; };
      joinBtn.onmouseleave = () => { joinBtn.style.transform = 'scale(1)'; };
      joinBtn.onclick = (e) => {
        e.stopPropagation();
        this.callbacks.onJoinPlanet(planet.id);
      };
      card.appendChild(joinBtn);
    }

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
      <div style="font-size: 64px; margin-bottom: 20px; animation: pulse 1.5s ease-in-out infinite;">🪐</div>
      <div style="font-size: 18px;">Loading planets...</div>
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
      <div style="font-size: 18px; color: #f44336; margin-bottom: 10px;">Failed to Load</div>
      <div style="font-size: 14px; color: #666; margin-bottom: 25px;">${this.error}</div>
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
        retryBtn.onclick = () => this.loadData();
      }
    }, 0);

    return error;
  }

  destroy(): void {
    this.container.remove();
  }
}
