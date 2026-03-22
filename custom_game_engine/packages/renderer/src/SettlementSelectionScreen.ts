/**
 * SettlementSelectionScreen - Browse and join settlements on a planet
 *
 * Shows all settlements on a selected planet.
 * Users can join an existing settlement or create a new one.
 * Multiple settlements can coexist on the same planet, sharing biosphere.
 *
 * Hierarchy: Universe → Planet → Settlement (this screen)
 */

import type { SettlementData } from '@ai-village/persistence';
import { PlanetClient } from '@ai-village/persistence';
import { getPlayerId } from './utils/GameStateHelpers.js';
import { PLANET_SERVER_URL } from './urlConfig.js';

export interface PlanetDetails {
  id: string;
  name: string;
  type: string;
  hasBiosphere: boolean;
  createdAt: number;
}

export interface SettlementSelectionCallbacks {
  onJoinSettlement: (settlementId: string, isNew: boolean) => void;
  onCreateSettlement: () => void;
  onBack: () => void;
}

export class SettlementSelectionScreen {
  private container: HTMLElement;
  private callbacks: SettlementSelectionCallbacks;
  private planetId: string = '';
  private planet: PlanetDetails | null = null;
  private settlements: SettlementData[] = [];
  private loading: boolean = false;
  private error: string | null = null;
  private creatingSettlement: boolean = false;
  private newSettlementName: string = '';

  private planetClient: PlanetClient;

  constructor(containerId: string = 'settlement-selection-screen', callbacks: SettlementSelectionCallbacks) {
    this.callbacks = callbacks;
    this.planetClient = new PlanetClient(PLANET_SERVER_URL);

    const existing = document.getElementById(containerId);
    if (existing) {
      this.container = existing;
    } else {
      this.container = document.createElement('div');
      this.container.id = containerId;
      this.container.className = 'settlement-selection-screen';
      this.container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #0a0a1a 0%, #1a2a3e 50%, #0a1a2a 100%);
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

  async show(planetId: string, planetDetails?: PlanetDetails): Promise<void> {
    this.planetId = planetId;
    this.planet = planetDetails || null;
    this.container.style.display = 'flex';
    await this.loadData();
    this.render();
  }

  hide(): void {
    this.container.style.display = 'none';
    this.creatingSettlement = false;
  }

  private async loadData(): Promise<void> {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      // Set player ID for tracking
      const playerId = getPlayerId();
      this.planetClient.setPlayerId(playerId);

      // Load planet details if not provided
      if (!this.planet) {
        const planetMeta = await this.planetClient.getPlanet(this.planetId);
        if (planetMeta) {
          this.planet = {
            id: planetMeta.id,
            name: planetMeta.name,
            type: planetMeta.type,
            hasBiosphere: planetMeta.hasBiosphere,
            createdAt: planetMeta.createdAt,
          };
        }
      }

      // Load settlements
      this.settlements = await this.planetClient.getSettlements(this.planetId);
      this.settlements.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('[SettlementSelection] Failed to load data:', error);
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
      @keyframes settlement-glow {
        0%, 100% { box-shadow: 0 0 10px rgba(76, 175, 80, 0.3); }
        50% { box-shadow: 0 0 20px rgba(76, 175, 80, 0.5); }
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
      // Planet info banner
      if (this.planet) {
        content.appendChild(this.renderPlanetBanner());
      }

      // Settlement creation form (if active)
      if (this.creatingSettlement) {
        content.appendChild(this.renderCreationForm());
      }

      content.appendChild(this.renderSettlementGrid());
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
    backBtn.textContent = '← Back to Planets';
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
    backBtn.onmouseenter = () => { backBtn.style.borderColor = '#4CAF50'; backBtn.style.color = '#fff'; };
    backBtn.onmouseleave = () => { backBtn.style.borderColor = '#3a3a5a'; backBtn.style.color = '#888'; };
    backBtn.onclick = () => this.callbacks.onBack();
    left.appendChild(backBtn);

    const title = document.createElement('h1');
    title.textContent = '🏘️ Settlements';
    title.style.cssText = `
      margin: 0;
      font-size: 28px;
      font-weight: normal;
      color: #fff;
      text-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
    `;
    left.appendChild(title);

    header.appendChild(left);

    // Right side - create button
    const createBtn = document.createElement('button');
    createBtn.textContent = '🏗️ Found New Settlement';
    createBtn.style.cssText = `
      padding: 14px 28px;
      font-size: 16px;
      font-family: monospace;
      background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    `;
    createBtn.onmouseenter = () => {
      createBtn.style.transform = 'scale(1.05)';
      createBtn.style.boxShadow = '0 0 30px rgba(76, 175, 80, 0.4)';
    };
    createBtn.onmouseleave = () => {
      createBtn.style.transform = 'scale(1)';
      createBtn.style.boxShadow = 'none';
    };
    createBtn.onclick = () => {
      this.creatingSettlement = true;
      this.render();
    };
    header.appendChild(createBtn);

    return header;
  }

  private renderPlanetBanner(): HTMLElement {
    const banner = document.createElement('div');
    banner.style.cssText = `
      background: linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(56, 142, 60, 0.1) 100%);
      border: 1px solid rgba(76, 175, 80, 0.3);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 25px;
      display: flex;
      gap: 30px;
      flex-wrap: wrap;
    `;

    // Planet type icons
    const typeIcons: Record<string, string> = {
      terrestrial: '🌍', desert: '🏜️', ice: '❄️', oceanic: '🌊',
      volcanic: '🌋', magical: '✨', fungal: '🍄', crystal: '💎',
    };

    const planetSection = document.createElement('div');
    planetSection.style.cssText = 'display: flex; align-items: center; gap: 15px;';
    planetSection.innerHTML = `
      <span style="font-size: 40px;">${typeIcons[this.planet!.type] || '🪐'}</span>
      <div>
        <div style="font-size: 18px; font-weight: bold; color: #fff;">${this.planet!.name}</div>
        <div style="font-size: 12px; color: #888; text-transform: capitalize;">${this.planet!.type} planet</div>
      </div>
    `;
    banner.appendChild(planetSection);

    const biosphereSection = document.createElement('div');
    biosphereSection.innerHTML = `
      <div style="font-size: 12px; color: #888; margin-bottom: 4px;">Biosphere</div>
      <div style="font-size: 14px; color: ${this.planet!.hasBiosphere ? '#4CAF50' : '#ff9800'};">
        ${this.planet!.hasBiosphere ? '✓ Ready' : '⏳ Generating...'}
      </div>
    `;
    banner.appendChild(biosphereSection);

    const statsSection = document.createElement('div');
    statsSection.style.cssText = 'margin-left: auto; text-align: right;';
    statsSection.innerHTML = `
      <div style="font-size: 12px; color: #888; margin-bottom: 4px;">Settlements</div>
      <div style="font-size: 24px; color: #4CAF50; font-weight: bold;">
        ${this.settlements.length}
      </div>
    `;
    banner.appendChild(statsSection);

    return banner;
  }

  private renderCreationForm(): HTMLElement {
    const form = document.createElement('div');
    form.style.cssText = `
      background: rgba(30, 50, 40, 0.8);
      border: 2px solid #4CAF50;
      border-radius: 12px;
      padding: 25px;
      margin-bottom: 25px;
      animation: float-in 0.3s ease-out;
    `;

    const titleRow = document.createElement('div');
    titleRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;';

    const formTitle = document.createElement('h3');
    formTitle.textContent = '🏗️ Found a New Settlement';
    formTitle.style.cssText = 'margin: 0; font-size: 18px; color: #4CAF50;';
    titleRow.appendChild(formTitle);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '✕';
    cancelBtn.style.cssText = `
      width: 30px;
      height: 30px;
      font-size: 16px;
      background: transparent;
      color: #888;
      border: 1px solid #3a3a5a;
      border-radius: 50%;
      cursor: pointer;
    `;
    cancelBtn.onclick = () => {
      this.creatingSettlement = false;
      this.newSettlementName = '';
      this.render();
    };
    titleRow.appendChild(cancelBtn);

    form.appendChild(titleRow);

    // Name input
    const inputRow = document.createElement('div');
    inputRow.style.cssText = 'display: flex; gap: 15px;';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Enter settlement name...';
    nameInput.value = this.newSettlementName;
    nameInput.style.cssText = `
      flex: 1;
      padding: 12px 16px;
      font-size: 16px;
      font-family: monospace;
      background: rgba(0, 0, 0, 0.3);
      color: #fff;
      border: 1px solid #3a5a4a;
      border-radius: 8px;
      outline: none;
    `;
    nameInput.onfocus = () => { nameInput.style.borderColor = '#4CAF50'; };
    nameInput.onblur = () => { nameInput.style.borderColor = '#3a5a4a'; };
    nameInput.oninput = (e) => { this.newSettlementName = (e.target as HTMLInputElement).value; };
    inputRow.appendChild(nameInput);

    const foundBtn = document.createElement('button');
    foundBtn.textContent = '🏗️ Found Settlement';
    foundBtn.style.cssText = `
      padding: 12px 24px;
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
    foundBtn.onclick = () => this.createSettlement();
    inputRow.appendChild(foundBtn);

    form.appendChild(inputRow);

    // Description
    const desc = document.createElement('div');
    desc.style.cssText = 'margin-top: 15px; font-size: 13px; color: #888; line-height: 1.5;';
    desc.textContent = 'Your settlement will share this planet\'s biosphere (creatures, plants, sprites) with other settlements. Each settlement has its own agents and can develop independently.';
    form.appendChild(desc);

    return form;
  }

  private async createSettlement(): Promise<void> {
    if (!this.newSettlementName.trim()) {
      return;
    }

    try {
      const playerId = getPlayerId();
      const settlementId = `settlement_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Generate a color based on name hash
      let hash = 0;
      for (let i = 0; i < this.newSettlementName.length; i++) {
        hash = ((hash << 5) - hash) + this.newSettlementName.charCodeAt(i);
        hash = hash & hash;
      }
      const hue = Math.abs(hash) % 360;

      const settlement = await this.planetClient.createSettlement(this.planetId, {
        id: settlementId,
        name: this.newSettlementName.trim(),
        ownerId: playerId,
        foundedTick: 0,
        agentCount: 0,
        centerX: 0,
        centerY: 0,
        color: `hsl(${hue}, 70%, 50%)`,
      });

      // Join the newly created settlement
      this.creatingSettlement = false;
      this.newSettlementName = '';
      this.callbacks.onJoinSettlement(settlementId, true);
    } catch (error) {
      console.error('[SettlementSelection] Failed to create settlement:', error);
      this.error = `Failed to create settlement: ${(error as Error).message}`;
      this.render();
    }
  }

  private renderSettlementGrid(): HTMLElement {
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    `;

    if (this.settlements.length === 0 && !this.creatingSettlement) {
      const empty = document.createElement('div');
      empty.style.cssText = `
        grid-column: 1 / -1;
        text-align: center;
        padding: 80px 20px;
        color: #666;
      `;
      empty.innerHTML = `
        <div style="font-size: 64px; margin-bottom: 20px; opacity: 0.5;">🏘️</div>
        <div style="font-size: 18px; margin-bottom: 10px;">No settlements yet</div>
        <div style="font-size: 14px; color: #555; margin-bottom: 25px;">Be the first to found a settlement on this planet!</div>
        <button id="empty-create-btn" style="
          padding: 14px 28px;
          font-size: 16px;
          font-family: monospace;
          background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        ">🏗️ Found Settlement</button>
      `;
      grid.appendChild(empty);

      setTimeout(() => {
        const btn = document.getElementById('empty-create-btn');
        if (btn) {
          btn.onclick = () => {
            this.creatingSettlement = true;
            this.render();
          };
        }
      }, 0);

      return grid;
    }

    this.settlements.forEach((settlement, index) => {
      grid.appendChild(this.renderSettlementCard(settlement, index));
    });

    return grid;
  }

  private renderSettlementCard(settlement: SettlementData, index: number): HTMLElement {
    const playerId = getPlayerId();
    const isOwner = settlement.ownerId === playerId;

    const card = document.createElement('div');
    card.style.cssText = `
      background: rgba(30, 40, 35, 0.8);
      border: 2px solid ${isOwner ? '#4CAF50' : '#3a5a4a'};
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.2s;
      animation: float-in 0.3s ease-out ${index * 0.05}s both;
    `;

    card.onmouseenter = () => {
      card.style.borderColor = '#4CAF50';
      card.style.transform = 'translateY(-4px)';
      card.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
    };
    card.onmouseleave = () => {
      card.style.borderColor = isOwner ? '#4CAF50' : '#3a5a4a';
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = 'none';
    };
    card.onclick = () => this.callbacks.onJoinSettlement(settlement.id, false);

    // Header row
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display: flex; align-items: center; gap: 12px; margin-bottom: 12px;';

    // Color indicator
    const colorDot = document.createElement('div');
    colorDot.style.cssText = `
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${settlement.color || '#4CAF50'};
      border: 2px solid rgba(255,255,255,0.3);
      box-shadow: 0 0 10px ${settlement.color || '#4CAF50'};
    `;
    headerRow.appendChild(colorDot);

    const nameWrapper = document.createElement('div');
    nameWrapper.style.cssText = 'flex: 1;';

    const name = document.createElement('div');
    name.textContent = settlement.name;
    name.style.cssText = 'font-size: 18px; font-weight: bold; color: #fff;';
    nameWrapper.appendChild(name);

    if (isOwner) {
      const ownerBadge = document.createElement('span');
      ownerBadge.textContent = '👑 Your Settlement';
      ownerBadge.style.cssText = 'font-size: 11px; color: #ffb300;';
      nameWrapper.appendChild(ownerBadge);
    }

    headerRow.appendChild(nameWrapper);
    card.appendChild(headerRow);

    // Description
    if (settlement.description) {
      const desc = document.createElement('div');
      desc.textContent = settlement.description;
      desc.style.cssText = 'font-size: 13px; color: #999; margin-bottom: 12px; line-height: 1.4;';
      card.appendChild(desc);
    }

    // Stats row
    const stats = document.createElement('div');
    stats.style.cssText = 'display: flex; gap: 20px; font-size: 12px; color: #888; margin-top: 15px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);';

    const agentCount = document.createElement('span');
    agentCount.textContent = `👥 ${settlement.agentCount} agents`;
    stats.appendChild(agentCount);

    const founded = document.createElement('span');
    founded.textContent = `📅 Founded ${this.formatDate(settlement.createdAt)}`;
    stats.appendChild(founded);

    card.appendChild(stats);

    // Join button
    const joinBtn = document.createElement('button');
    joinBtn.textContent = isOwner ? '▶ Continue' : '▶ Join Settlement';
    joinBtn.style.cssText = `
      width: 100%;
      margin-top: 15px;
      padding: 12px;
      font-size: 14px;
      font-family: monospace;
      font-weight: bold;
      background: linear-gradient(135deg, ${isOwner ? '#4CAF50' : '#667eea'} 0%, ${isOwner ? '#388E3C' : '#764ba2'} 100%);
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
      this.callbacks.onJoinSettlement(settlement.id, false);
    };
    card.appendChild(joinBtn);

    return card;
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
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
      <div style="font-size: 64px; margin-bottom: 20px; animation: pulse 1.5s ease-in-out infinite;">🏘️</div>
      <div style="font-size: 18px;">Loading settlements...</div>
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
        background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
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
