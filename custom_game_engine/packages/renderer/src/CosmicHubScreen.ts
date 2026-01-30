/**
 * CosmicHubScreen - Main menu for god-mode creation
 *
 * This is the entry point for the cosmic creation system, showing:
 * - Existing universes (with their magic laws)
 * - Planets within each universe
 * - Actions: Create Universe, Create Planet, Become a Deity
 *
 * Flow:
 * 1. Create Universe → UniverseCreationScreen (magic laws + cosmic deities)
 * 2. Create Planet → PlanetCreationScreen (planet type + art style + biosphere)
 * 3. Become a Deity → Start game on selected planet
 */

export interface UniverseInfo {
  id: string;
  name: string;
  magicPreset: string;
  createdAt: number;
  planetCount: number;
}

export interface PlanetInfo {
  id: string;
  universeId: string;
  name: string;
  type: string;
  artStyle: string;
  hasBiosphere: boolean;
  speciesCount: number;
  createdAt: number;
}

export interface CosmicHubCallbacks {
  onCreateUniverse: () => void;
  onCreatePlanet: (universeId: string) => void;
  onBecomeDeity: (planetId: string, universeId: string) => void;
  onLoadUniverse: (universeId: string) => Promise<UniverseInfo | null>;
  onLoadPlanets: (universeId: string) => Promise<PlanetInfo[]>;
}

export class CosmicHubScreen {
  private container: HTMLElement;
  private callbacks: CosmicHubCallbacks;
  private universes: UniverseInfo[] = [];
  private planets: PlanetInfo[] = [];
  private selectedUniverseId: string | null = null;
  private selectedPlanetId: string | null = null;
  private loading: boolean = false;

  constructor(containerId: string = 'cosmic-hub-screen', callbacks: CosmicHubCallbacks) {
    this.callbacks = callbacks;

    const existing = document.getElementById(containerId);
    if (existing) {
      this.container = existing;
    } else {
      this.container = document.createElement('div');
      this.container.id = containerId;
      this.container.className = 'cosmic-hub-screen';
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

  async show(): Promise<void> {
    this.container.style.display = 'flex';
    await this.loadData();
    this.render();
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  private async loadData(): Promise<void> {
    this.loading = true;
    this.render();

    // In a real implementation, these would load from persistence
    // For now, we'll show the empty state which prompts universe creation
    this.loading = false;
  }

  setUniverses(universes: UniverseInfo[]): void {
    this.universes = universes;
    this.render();
  }

  setPlanets(planets: PlanetInfo[]): void {
    this.planets = planets;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';

    // Cosmic background with stars
    this.renderStarfield();

    // Main content wrapper
    const content = document.createElement('div');
    content.style.cssText = `
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      overflow-y: auto;
    `;

    // Title
    const title = document.createElement('h1');
    title.textContent = 'The Cosmic Void';
    title.style.cssText = `
      margin: 0 0 10px 0;
      font-size: 48px;
      font-weight: normal;
      text-align: center;
      color: #fff;
      text-shadow: 0 0 30px rgba(100, 150, 255, 0.5), 0 0 60px rgba(100, 150, 255, 0.3);
      letter-spacing: 4px;
    `;
    content.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'From nothing, create everything.';
    subtitle.style.cssText = `
      margin: 0 0 40px 0;
      font-size: 16px;
      text-align: center;
      color: #8888aa;
      font-style: italic;
    `;
    content.appendChild(subtitle);

    if (this.loading) {
      const loader = document.createElement('div');
      loader.textContent = 'Peering into the void...';
      loader.style.cssText = 'font-size: 18px; color: #667eea; margin-top: 100px;';
      content.appendChild(loader);
    } else {
      // Main layout: two columns
      const layout = document.createElement('div');
      layout.style.cssText = `
        display: flex;
        gap: 40px;
        max-width: 1400px;
        width: 100%;
        flex: 1;
      `;

      // Left column: Universes
      layout.appendChild(this.renderUniversesPanel());

      // Right column: Selected universe details + planets
      layout.appendChild(this.renderDetailsPanel());

      content.appendChild(layout);
    }

    this.container.appendChild(content);
  }

  private renderStarfield(): void {
    const starfield = document.createElement('div');
    starfield.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      pointer-events: none;
    `;

    // Create random stars
    for (let i = 0; i < 200; i++) {
      const star = document.createElement('div');
      const size = Math.random() * 3 + 1;
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const opacity = Math.random() * 0.8 + 0.2;
      const twinkle = Math.random() * 3 + 2;

      star.style.cssText = `
        position: absolute;
        left: ${x}%;
        top: ${y}%;
        width: ${size}px;
        height: ${size}px;
        background: white;
        border-radius: 50%;
        opacity: ${opacity};
        animation: twinkle ${twinkle}s ease-in-out infinite;
      `;
      starfield.appendChild(star);
    }

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes twinkle {
        0%, 100% { opacity: 0.2; }
        50% { opacity: 1; }
      }
    `;
    starfield.appendChild(style);

    this.container.appendChild(starfield);
  }

  private renderUniversesPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      flex: 1;
      min-width: 350px;
      background: rgba(20, 20, 40, 0.8);
      border: 1px solid #3a3a6a;
      border-radius: 12px;
      padding: 25px;
      display: flex;
      flex-direction: column;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;';

    const headerTitle = document.createElement('h2');
    headerTitle.textContent = 'Universes';
    headerTitle.style.cssText = 'margin: 0; font-size: 20px; color: #9999ff;';
    header.appendChild(headerTitle);

    const createBtn = document.createElement('button');
    createBtn.textContent = '+ Create Universe';
    createBtn.style.cssText = `
      padding: 10px 20px;
      font-size: 14px;
      font-family: monospace;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: transform 0.2s;
    `;
    createBtn.onmouseenter = () => { createBtn.style.transform = 'scale(1.05)'; };
    createBtn.onmouseleave = () => { createBtn.style.transform = 'scale(1)'; };
    createBtn.onclick = () => this.callbacks.onCreateUniverse();
    header.appendChild(createBtn);

    panel.appendChild(header);

    // Universe list
    const list = document.createElement('div');
    list.style.cssText = 'flex: 1; overflow-y: auto;';

    if (this.universes.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = `
        text-align: center;
        padding: 60px 20px;
        color: #666;
      `;
      empty.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">✨</div>
        <div style="font-size: 16px; margin-bottom: 10px;">The void awaits creation</div>
        <div style="font-size: 13px; color: #555;">Create your first universe to begin shaping reality</div>
      `;
      list.appendChild(empty);
    } else {
      for (const universe of this.universes) {
        list.appendChild(this.renderUniverseCard(universe));
      }
    }

    panel.appendChild(list);
    return panel;
  }

  private renderUniverseCard(universe: UniverseInfo): HTMLElement {
    const isSelected = this.selectedUniverseId === universe.id;

    const card = document.createElement('div');
    card.style.cssText = `
      background: ${isSelected ? 'rgba(102, 126, 234, 0.2)' : 'rgba(30, 30, 60, 0.6)'};
      border: 2px solid ${isSelected ? '#667eea' : '#3a3a5a'};
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: all 0.2s;
    `;
    card.onmouseenter = () => {
      if (!isSelected) card.style.borderColor = '#5a5a8a';
    };
    card.onmouseleave = () => {
      if (!isSelected) card.style.borderColor = '#3a3a5a';
    };
    card.onclick = async () => {
      this.selectedUniverseId = universe.id;
      this.selectedPlanetId = null;
      this.planets = await this.callbacks.onLoadPlanets(universe.id);
      this.render();
    };

    const name = document.createElement('div');
    name.textContent = universe.name;
    name.style.cssText = `font-size: 18px; font-weight: bold; color: ${isSelected ? '#667eea' : '#fff'}; margin-bottom: 8px;`;
    card.appendChild(name);

    const meta = document.createElement('div');
    meta.style.cssText = 'display: flex; gap: 15px; font-size: 12px; color: #888;';
    meta.innerHTML = `
      <span>🌌 ${universe.magicPreset}</span>
      <span>🪐 ${universe.planetCount} planets</span>
    `;
    card.appendChild(meta);

    return card;
  }

  private renderDetailsPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      flex: 1.5;
      min-width: 500px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    `;

    if (!this.selectedUniverseId) {
      // No universe selected
      const placeholder = document.createElement('div');
      placeholder.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(20, 20, 40, 0.4);
        border: 1px dashed #3a3a6a;
        border-radius: 12px;
        padding: 60px;
        text-align: center;
      `;
      placeholder.innerHTML = `
        <div style="font-size: 64px; margin-bottom: 20px; opacity: 0.5;">🌌</div>
        <div style="font-size: 18px; color: #777; margin-bottom: 10px;">Select or create a universe</div>
        <div style="font-size: 13px; color: #555;">Universes contain planets where life evolves</div>
      `;
      panel.appendChild(placeholder);
    } else {
      // Show planets for selected universe
      panel.appendChild(this.renderPlanetsSection());

      // Become a Deity button
      if (this.selectedPlanetId) {
        panel.appendChild(this.renderBecomeDeitySection());
      }
    }

    return panel;
  }

  private renderPlanetsSection(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = `
      background: rgba(20, 20, 40, 0.8);
      border: 1px solid #3a3a6a;
      border-radius: 12px;
      padding: 25px;
      flex: 1;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;';

    const headerTitle = document.createElement('h2');
    headerTitle.textContent = 'Planets';
    headerTitle.style.cssText = 'margin: 0; font-size: 20px; color: #ff9800;';
    header.appendChild(headerTitle);

    const createBtn = document.createElement('button');
    createBtn.textContent = '+ Create Planet';
    createBtn.style.cssText = `
      padding: 10px 20px;
      font-size: 14px;
      font-family: monospace;
      background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
      color: #fff;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: transform 0.2s;
    `;
    createBtn.onmouseenter = () => { createBtn.style.transform = 'scale(1.05)'; };
    createBtn.onmouseleave = () => { createBtn.style.transform = 'scale(1)'; };
    createBtn.onclick = () => this.callbacks.onCreatePlanet(this.selectedUniverseId!);
    header.appendChild(createBtn);

    section.appendChild(header);

    // Planet grid
    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 15px;';

    const universePlanets = this.planets.filter(p => p.universeId === this.selectedUniverseId);

    if (universePlanets.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;';
      empty.innerHTML = `
        <div style="font-size: 36px; margin-bottom: 15px;">🪐</div>
        <div>No planets yet in this universe</div>
        <div style="font-size: 12px; color: #555; margin-top: 5px;">Create a planet to give life a home</div>
      `;
      grid.appendChild(empty);
    } else {
      for (const planet of universePlanets) {
        grid.appendChild(this.renderPlanetCard(planet));
      }
    }

    section.appendChild(grid);
    return section;
  }

  private renderPlanetCard(planet: PlanetInfo): HTMLElement {
    const isSelected = this.selectedPlanetId === planet.id;

    const card = document.createElement('div');
    card.style.cssText = `
      background: ${isSelected ? 'rgba(255, 152, 0, 0.2)' : 'rgba(30, 30, 60, 0.6)'};
      border: 2px solid ${isSelected ? '#ff9800' : '#3a3a5a'};
      border-radius: 10px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s;
    `;
    card.onmouseenter = () => {
      if (!isSelected) card.style.borderColor = '#5a5a8a';
    };
    card.onmouseleave = () => {
      if (!isSelected) card.style.borderColor = '#3a3a5a';
    };
    card.onclick = () => {
      this.selectedPlanetId = planet.id;
      this.render();
    };

    // Planet icon based on type
    const icons: Record<string, string> = {
      terrestrial: '🌍', desert: '🏜️', ice: '❄️', ocean: '🌊',
      volcanic: '🌋', magical: '✨', fungal: '🍄', crystal: '💎',
    };

    const icon = document.createElement('div');
    icon.textContent = icons[planet.type] || '🪐';
    icon.style.cssText = 'font-size: 32px; margin-bottom: 10px;';
    card.appendChild(icon);

    const name = document.createElement('div');
    name.textContent = planet.name;
    name.style.cssText = `font-size: 16px; font-weight: bold; color: ${isSelected ? '#ff9800' : '#fff'}; margin-bottom: 6px;`;
    card.appendChild(name);

    const meta = document.createElement('div');
    meta.style.cssText = 'font-size: 11px; color: #888;';
    meta.innerHTML = `
      <div>${planet.type} · ${planet.artStyle}</div>
      <div>${planet.hasBiosphere ? `🦎 ${planet.speciesCount} species` : '⏳ No biosphere'}</div>
    `;
    card.appendChild(meta);

    if (isSelected) {
      const selected = document.createElement('div');
      selected.textContent = '✓ Selected';
      selected.style.cssText = 'margin-top: 10px; font-size: 12px; color: #ff9800;';
      card.appendChild(selected);
    }

    return card;
  }

  private renderBecomeDeitySection(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = `
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 140, 0, 0.1) 100%);
      border: 2px solid #ffd700;
      border-radius: 12px;
      padding: 30px;
      text-align: center;
    `;

    const planet = this.planets.find(p => p.id === this.selectedPlanetId);

    const title = document.createElement('h3');
    title.textContent = 'Ready to Begin';
    title.style.cssText = 'margin: 0 0 15px 0; font-size: 24px; color: #ffd700;';
    section.appendChild(title);

    const desc = document.createElement('p');
    desc.textContent = `Enter ${planet?.name || 'this world'} as a divine being. Watch over your creation, guide mortals, and shape the course of history.`;
    desc.style.cssText = 'margin: 0 0 25px 0; font-size: 14px; color: #bbb; max-width: 500px; margin-left: auto; margin-right: auto;';
    section.appendChild(desc);

    const btn = document.createElement('button');
    btn.innerHTML = '👁️ Become a Deity';
    btn.style.cssText = `
      padding: 18px 50px;
      font-size: 20px;
      font-family: monospace;
      font-weight: bold;
      background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
      color: #000;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
    `;
    btn.onmouseenter = () => {
      btn.style.transform = 'scale(1.05)';
      btn.style.boxShadow = '0 0 50px rgba(255, 215, 0, 0.5)';
    };
    btn.onmouseleave = () => {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '0 0 30px rgba(255, 215, 0, 0.3)';
    };
    btn.onclick = () => {
      if (this.selectedPlanetId && this.selectedUniverseId) {
        this.callbacks.onBecomeDeity(this.selectedPlanetId, this.selectedUniverseId);
      }
    };
    section.appendChild(btn);

    return section;
  }

  destroy(): void {
    this.container.remove();
  }
}
