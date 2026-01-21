/**
 * UniversePlanetsScreen - View and manage planets within a universe
 *
 * Shown after universe selection/creation. Allows players to:
 * - View all planets in the current universe
 * - Create new planets (generate or select from registry)
 * - Choose an existing planet to start on
 * - See planet details and history
 *
 * This screen bridges universe selection and game start.
 */

import {
  type PlanetType,
  type PlanetCategory,
  PLANET_CATEGORIES,
  PLANET_TYPE_INFO,
} from '@ai-village/world';

export interface PlanetMetadata {
  id: string;
  name: string;
  type: PlanetType;
  seed: string;
  hasBiosphere: boolean;
  chunkCount: number;
  saveCount: number;
  createdAt: number;
  lastAccessedAt: number;
}

export interface UniversePlanetsResult {
  action: 'create_new' | 'select_existing' | 'back';
  planetType?: PlanetType;
  planetId?: string;
  planetName?: string;
  spawnLocation?: { type: 'random' | 'named' | 'coordinates'; value?: string | { x: number; y: number } };
}

export class UniversePlanetsScreen {
  private container: HTMLElement;
  private _onSelect: ((result: UniversePlanetsResult) => void) | null = null;
  private universeName: string = '';
  private universeId: string = '';

  // Planet selection state
  private selectedCategory: PlanetCategory | 'all' | 'existing' = 'all';
  private selectedPlanetType: PlanetType | null = null;
  private selectedExistingPlanet: PlanetMetadata | null = null;
  private customPlanetName: string = '';

  // Server data
  private existingPlanets: PlanetMetadata[] = [];
  private isLoading: boolean = false;
  private serverAvailable: boolean = false;

  private readonly API_BASE = 'http://localhost:8766';

  constructor(containerId: string = 'universe-planets-screen') {
    const existing = document.getElementById(containerId);
    if (existing) {
      this.container = existing;
    } else {
      this.container = document.createElement('div');
      this.container.id = containerId;
      this.container.className = 'universe-planets-screen';
      this.container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        display: none;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        padding: 40px;
        box-sizing: border-box;
        z-index: 10001;
        font-family: monospace;
        color: #e0e0e0;
        overflow-y: auto;
      `;
      document.body.appendChild(this.container);
    }
  }

  async show(
    universeId: string,
    universeName: string,
    onSelectCallback: (result: UniversePlanetsResult) => void
  ): Promise<void> {
    this._onSelect = onSelectCallback;
    this.universeId = universeId;
    this.universeName = universeName;
    this.container.style.display = 'flex';

    // Load existing planets from registry
    await this.loadExistingPlanets();
    this.render();
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  private async loadExistingPlanets(): Promise<void> {
    this.isLoading = true;

    try {
      const response = await fetch(`${this.API_BASE}/api/planets`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const data = await response.json();
        this.existingPlanets = data.planets || [];
        this.serverAvailable = true;
      } else {
        this.existingPlanets = [];
        this.serverAvailable = false;
      }
    } catch (error) {
      console.warn('[UniversePlanetsScreen] Failed to load planets:', error);
      this.existingPlanets = [];
      this.serverAvailable = false;
    } finally {
      this.isLoading = false;
    }
  }

  private render(): void {
    this.container.innerHTML = '';

    // Universe header
    const universeHeader = document.createElement('div');
    universeHeader.style.cssText = 'margin-bottom: 20px; text-align: center;';
    universeHeader.innerHTML = `
      <div style="font-size: 14px; color: #667eea; margin-bottom: 5px;">UNIVERSE</div>
      <h1 style="margin: 0; font-size: 32px; color: #fff; text-shadow: 0 0 20px rgba(100, 200, 255, 0.3);">
        ${this.universeName || 'New Universe'}
      </h1>
    `;
    this.container.appendChild(universeHeader);

    // Main title
    const title = document.createElement('h2');
    title.textContent = 'Choose Your World';
    title.style.cssText = 'margin: 0 0 10px 0; font-size: 28px; color: #fff; text-align: center;';
    this.container.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Select an existing planet or generate a new one';
    subtitle.style.cssText = 'margin: 0 0 30px 0; font-size: 14px; text-align: center; color: #888;';
    this.container.appendChild(subtitle);

    // Main content area
    const mainContent = document.createElement('div');
    mainContent.style.cssText = 'display: flex; gap: 30px; max-width: 1400px; width: 100%;';

    // Left: Category tabs
    mainContent.appendChild(this.renderCategoryTabs());

    // Right: Planet grid
    mainContent.appendChild(this.renderPlanetGrid());

    this.container.appendChild(mainContent);

    // Bottom: Action buttons
    this.container.appendChild(this.renderActionBar());
  }

  private renderCategoryTabs(): HTMLElement {
    const sidebar = document.createElement('div');
    sidebar.style.cssText = `
      flex: 0 0 200px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;

    const sidebarTitle = document.createElement('div');
    sidebarTitle.textContent = 'Categories';
    sidebarTitle.style.cssText = 'font-size: 14px; color: #888; margin-bottom: 10px; padding: 0 10px;';
    sidebar.appendChild(sidebarTitle);

    // All planets tab
    sidebar.appendChild(this.createCategoryTab('all', '🌌', 'All Types', this.selectedCategory === 'all'));

    // Existing planets tab (if server available)
    if (this.serverAvailable && this.existingPlanets.length > 0) {
      sidebar.appendChild(this.createCategoryTab(
        'existing',
        '📦',
        `Existing (${this.existingPlanets.length})`,
        this.selectedCategory === 'existing'
      ));
    }

    // Divider
    const divider = document.createElement('div');
    divider.style.cssText = 'height: 1px; background: #3a3a5a; margin: 10px 0;';
    sidebar.appendChild(divider);

    // Category tabs
    for (const category of PLANET_CATEGORIES) {
      const tab = this.createCategoryTab(
        category.id,
        category.icon,
        category.name,
        this.selectedCategory === category.id
      );
      sidebar.appendChild(tab);
    }

    return sidebar;
  }

  private createCategoryTab(
    id: PlanetCategory | 'all' | 'existing',
    icon: string,
    name: string,
    isActive: boolean
  ): HTMLElement {
    const tab = document.createElement('button');
    tab.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 15px;
      font-size: 14px;
      font-family: monospace;
      background: ${isActive ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)' : 'transparent'};
      color: ${isActive ? '#fff' : '#aaa'};
      border: 1px solid ${isActive ? '#667eea' : 'transparent'};
      border-radius: 8px;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s;
    `;
    tab.innerHTML = `
      <span style="font-size: 18px;">${icon}</span>
      <span>${name}</span>
    `;
    tab.onclick = () => {
      this.selectedCategory = id;
      this.selectedPlanetType = null;
      this.selectedExistingPlanet = null;
      this.render();
    };
    return tab;
  }

  private renderPlanetGrid(): HTMLElement {
    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      background: rgba(30, 30, 50, 0.5);
      border: 1px solid #3a3a5a;
      border-radius: 12px;
      padding: 25px;
      min-height: 500px;
    `;

    if (this.isLoading) {
      content.innerHTML = `
        <div style="text-align: center; padding: 60px; color: #888;">
          <div style="font-size: 48px; margin-bottom: 20px; animation: pulse 1s infinite;">🌍</div>
          <div>Loading planets...</div>
        </div>
      `;
      return content;
    }

    if (this.selectedCategory === 'existing') {
      content.appendChild(this.renderExistingPlanets());
    } else {
      content.appendChild(this.renderNewPlanetTypes());
    }

    return content;
  }

  private renderExistingPlanets(): HTMLElement {
    const container = document.createElement('div');

    const header = document.createElement('div');
    header.style.cssText = 'margin-bottom: 20px;';
    header.innerHTML = `
      <h3 style="margin: 0 0 5px 0; font-size: 18px; color: #4CAF50;">📦 Existing Planets from Registry</h3>
      <p style="margin: 0; font-size: 13px; color: #888;">These planets can be shared across multiple save games. Biosphere already generated!</p>
    `;
    container.appendChild(header);

    if (this.existingPlanets.length === 0) {
      container.innerHTML += `
        <div style="text-align: center; padding: 40px; color: #666;">
          <div style="font-size: 32px; margin-bottom: 15px;">📭</div>
          <div>No existing planets in the registry</div>
          <div style="font-size: 12px; margin-top: 5px;">Create your first planet to populate the registry</div>
        </div>
      `;
      return container;
    }

    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px;';

    for (const planet of this.existingPlanets) {
      const isSelected = this.selectedExistingPlanet?.id === planet.id;
      const card = document.createElement('div');
      const typeInfo = PLANET_TYPE_INFO[planet.type];

      card.style.cssText = `
        background: ${isSelected ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(56, 142, 60, 0.2) 100%)' : 'rgba(40, 40, 60, 0.8)'};
        border: 2px solid ${isSelected ? '#4CAF50' : '#3a3a5a'};
        border-radius: 10px;
        padding: 18px;
        cursor: pointer;
        transition: all 0.2s;
      `;
      card.onmouseover = () => {
        if (!isSelected) {
          card.style.borderColor = '#667eea';
        }
      };
      card.onmouseout = () => {
        if (!isSelected) {
          card.style.borderColor = '#3a3a5a';
        }
      };
      card.onclick = () => {
        this.selectedExistingPlanet = planet;
        this.selectedPlanetType = null;
        this.render();
      };

      const lastAccessed = new Date(planet.lastAccessedAt).toLocaleDateString();

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 24px;">${typeInfo?.icon || '🌍'}</span>
            <div>
              <div style="font-size: 16px; color: #fff; font-weight: bold;">${planet.name}</div>
              <div style="font-size: 12px; color: #888;">${typeInfo?.name || planet.type}</div>
            </div>
          </div>
          ${isSelected ? '<span style="color: #4CAF50; font-size: 20px;">✓</span>' : ''}
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; font-size: 11px; color: #aaa;">
          <span>${planet.hasBiosphere ? '🧬 Biosphere Ready' : '⏳ No Biosphere'}</span>
          <span>🗺️ ${planet.chunkCount} chunks</span>
          <span>💾 ${planet.saveCount} saves</span>
        </div>
        <div style="font-size: 11px; color: #666; margin-top: 8px;">
          Last accessed: ${lastAccessed}
        </div>
      `;

      grid.appendChild(card);
    }

    container.appendChild(grid);
    return container;
  }

  private renderNewPlanetTypes(): HTMLElement {
    const container = document.createElement('div');

    // Filter types by category
    let typesToShow: PlanetType[] = [];
    if (this.selectedCategory === 'all') {
      // Show all types, grouped by category
      for (const category of PLANET_CATEGORIES) {
        typesToShow = typesToShow.concat(category.types);
      }
    } else {
      const category = PLANET_CATEGORIES.find(c => c.id === this.selectedCategory);
      if (category) {
        typesToShow = category.types;
      }
    }

    // Show categories if showing all
    if (this.selectedCategory === 'all') {
      for (const category of PLANET_CATEGORIES) {
        const section = document.createElement('div');
        section.style.cssText = 'margin-bottom: 25px;';

        const categoryHeader = document.createElement('div');
        categoryHeader.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 15px;';
        categoryHeader.innerHTML = `
          <span style="font-size: 24px;">${category.icon}</span>
          <div>
            <div style="font-size: 16px; color: #fff; font-weight: bold;">${category.name}</div>
            <div style="font-size: 12px; color: #888;">${category.description}</div>
          </div>
        `;
        section.appendChild(categoryHeader);

        const grid = document.createElement('div');
        grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;';

        for (const planetType of category.types) {
          grid.appendChild(this.renderPlanetTypeCard(planetType));
        }

        section.appendChild(grid);
        container.appendChild(section);
      }
    } else {
      // Single category view
      const category = PLANET_CATEGORIES.find(c => c.id === this.selectedCategory);
      if (category) {
        const header = document.createElement('div');
        header.style.cssText = 'margin-bottom: 20px;';
        header.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 28px;">${category.icon}</span>
            <div>
              <h3 style="margin: 0; font-size: 20px; color: #fff;">${category.name}</h3>
              <p style="margin: 5px 0 0 0; font-size: 13px; color: #888;">${category.description}</p>
            </div>
          </div>
        `;
        container.appendChild(header);

        const grid = document.createElement('div');
        grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;';

        for (const planetType of category.types) {
          grid.appendChild(this.renderPlanetTypeCard(planetType, true));
        }

        container.appendChild(grid);
      }
    }

    return container;
  }

  private renderPlanetTypeCard(planetType: PlanetType, expanded: boolean = false): HTMLElement {
    const info = PLANET_TYPE_INFO[planetType];
    const isSelected = this.selectedPlanetType === planetType;

    const card = document.createElement('div');
    card.style.cssText = `
      background: ${isSelected ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)' : 'rgba(40, 40, 60, 0.6)'};
      border: 2px solid ${isSelected ? '#667eea' : '#3a3a5a'};
      border-radius: 10px;
      padding: ${expanded ? '18px' : '14px'};
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    `;
    card.onmouseover = () => {
      if (!isSelected) {
        card.style.borderColor = '#667eea';
        card.style.transform = 'translateY(-2px)';
      }
    };
    card.onmouseout = () => {
      if (!isSelected) {
        card.style.borderColor = '#3a3a5a';
        card.style.transform = 'translateY(0)';
      }
    };
    card.onclick = () => {
      this.selectedPlanetType = planetType;
      this.selectedExistingPlanet = null;
      this.render();
    };

    // Difficulty badge colors
    const difficultyColors: Record<string, string> = {
      easy: 'rgba(76, 175, 80, 0.3)',
      medium: 'rgba(255, 193, 7, 0.3)',
      hard: 'rgba(255, 152, 0, 0.3)',
      extreme: 'rgba(244, 67, 54, 0.3)',
    };
    const difficultyTextColors: Record<string, string> = {
      easy: '#8fdf8f',
      medium: '#ffc107',
      hard: '#ff9800',
      extreme: '#f44336',
    };

    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: ${expanded ? '10px' : '5px'};">
        <span style="font-size: ${expanded ? '28px' : '22px'};">${info?.icon || '🌍'}</span>
        <div>
          <div style="font-size: ${expanded ? '16px' : '14px'}; color: ${isSelected ? '#fff' : '#ddd'}; font-weight: bold;">
            ${info?.name || planetType}
          </div>
        </div>
      </div>
      ${expanded ? `<p style="margin: 0 0 10px 0; font-size: 13px; color: #aaa; line-height: 1.4;">${info?.description || ''}</p>` : ''}
      <div style="display: flex; gap: 8px; align-items: center;">
        <span style="font-size: 10px; padding: 3px 8px; background: ${difficultyColors[info?.difficulty || 'medium']}; color: ${difficultyTextColors[info?.difficulty || 'medium']}; border-radius: 10px; text-transform: uppercase;">
          ${info?.difficulty || 'medium'}
        </span>
      </div>
      ${isSelected ? '<div style="position: absolute; top: 10px; right: 10px; color: #667eea; font-size: 18px;">✓</div>' : ''}
    `;

    return card;
  }

  private renderActionBar(): HTMLElement {
    const actionBar = document.createElement('div');
    actionBar.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1400px;
      width: 100%;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #3a3a5a;
    `;

    // Left: Back button
    const backButton = document.createElement('button');
    backButton.textContent = '← Back to Universes';
    backButton.style.cssText = `
      padding: 12px 24px;
      font-size: 14px;
      font-family: monospace;
      background: transparent;
      color: #888;
      border: 1px solid #4a4a6a;
      border-radius: 8px;
      cursor: pointer;
    `;
    backButton.onclick = () => {
      if (this._onSelect) {
        this.hide();
        this._onSelect({ action: 'back' });
      }
    };
    actionBar.appendChild(backButton);

    // Center: Selection summary
    const summary = document.createElement('div');
    summary.style.cssText = 'text-align: center;';

    if (this.selectedExistingPlanet) {
      const typeInfo = PLANET_TYPE_INFO[this.selectedExistingPlanet.type];
      summary.innerHTML = `
        <div style="font-size: 12px; color: #4CAF50; margin-bottom: 3px;">SELECTED EXISTING PLANET</div>
        <div style="font-size: 18px; color: #fff;">
          ${typeInfo?.icon || '🌍'} ${this.selectedExistingPlanet.name}
        </div>
        <div style="font-size: 12px; color: #888; margin-top: 3px;">
          ${this.selectedExistingPlanet.hasBiosphere ? 'Biosphere ready - instant start!' : 'Will generate biosphere'}
        </div>
      `;
    } else if (this.selectedPlanetType) {
      const typeInfo = PLANET_TYPE_INFO[this.selectedPlanetType];
      summary.innerHTML = `
        <div style="font-size: 12px; color: #667eea; margin-bottom: 3px;">CREATING NEW PLANET</div>
        <div style="font-size: 18px; color: #fff;">
          ${typeInfo?.icon || '🌍'} ${typeInfo?.name || this.selectedPlanetType}
        </div>
        <div style="font-size: 12px; color: #888; margin-top: 3px;">
          Will generate unique biosphere (~1 min)
        </div>
      `;
    } else {
      summary.innerHTML = `
        <div style="font-size: 14px; color: #666;">Select a planet type or existing planet to continue</div>
      `;
    }
    actionBar.appendChild(summary);

    // Right: Proceed button
    const hasSelection = this.selectedPlanetType || this.selectedExistingPlanet;
    const proceedButton = document.createElement('button');
    proceedButton.textContent = this.selectedExistingPlanet ? 'Continue with Planet →' : 'Create Planet →';
    proceedButton.disabled = !hasSelection;
    proceedButton.style.cssText = `
      padding: 15px 35px;
      font-size: 16px;
      font-family: monospace;
      font-weight: bold;
      background: ${hasSelection ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#333'};
      color: ${hasSelection ? '#fff' : '#666'};
      border: none;
      border-radius: 8px;
      cursor: ${hasSelection ? 'pointer' : 'not-allowed'};
      transition: all 0.2s;
    `;
    if (hasSelection) {
      proceedButton.onmouseover = () => {
        proceedButton.style.transform = 'translateY(-2px)';
        proceedButton.style.boxShadow = '0 5px 20px rgba(102, 126, 234, 0.4)';
      };
      proceedButton.onmouseout = () => {
        proceedButton.style.transform = 'translateY(0)';
        proceedButton.style.boxShadow = 'none';
      };
    }
    proceedButton.onclick = () => {
      if (!hasSelection || !this._onSelect) return;

      this.hide();

      if (this.selectedExistingPlanet) {
        this._onSelect({
          action: 'select_existing',
          planetId: this.selectedExistingPlanet.id,
          planetType: this.selectedExistingPlanet.type,
          planetName: this.selectedExistingPlanet.name,
        });
      } else if (this.selectedPlanetType) {
        const typeInfo = PLANET_TYPE_INFO[this.selectedPlanetType];
        this._onSelect({
          action: 'create_new',
          planetType: this.selectedPlanetType,
          planetName: typeInfo?.name || this.selectedPlanetType,
        });
      }
    };
    actionBar.appendChild(proceedButton);

    return actionBar;
  }

  destroy(): void {
    this.container.remove();
  }
}
