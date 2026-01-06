/**
 * Hierarchy DOM Renderer
 *
 * Renders the hierarchy simulation UI to the DOM.
 * Reads from SimulationController, does NO game logic.
 *
 * Pattern: Renderer reads from controller, never writes to it
 */

import type { SimulationController } from '../simulation/SimulationController.js';
import type { AbstractTier, GameEvent } from '../abstraction/types.js';
import { TIER_SCALES } from '../abstraction/types.js';
import { TIME_SCALE } from '../renormalization/index.js';
import { Chart } from 'chart.js';

export class HierarchyDOMRenderer {
  private controller: SimulationController;
  private selectedTier: AbstractTier | null = null;
  private lastTreeRenderTime: number = 0;

  // Charts
  private populationChart: Chart | null = null;
  private productionChart: Chart | null = null;
  private tradeChart: Chart | null = null;
  private efficiencyChart: Chart | null = null;

  constructor(controller: SimulationController) {
    this.controller = controller;
  }

  /**
   * Initialize UI and start render loop
   */
  initialize(): void {
    this.initializeCharts();
    this.startRenderLoop();
  }

  /**
   * Set which tier is currently selected for detail view
   */
  setSelectedTier(tier: AbstractTier | null): void {
    this.selectedTier = tier;
    this.renderDetailPanel();
  }

  /**
   * Main render loop (runs at 60fps)
   */
  private startRenderLoop(): void {
    const render = () => {
      this.renderStats();
      this.renderTree();
      this.renderEventLog();
      this.renderCharts();
      this.renderDetailPanel();

      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  // ============================================================================
  // STATS HEADER
  // ============================================================================

  private renderStats(): void {
    const state = this.controller.getState();
    const stats = state.stats;

    const tickEl = document.getElementById('tick-count');
    const speedEl = document.getElementById('speed-value');
    const popEl = document.getElementById('population-count');
    const activeEl = document.getElementById('active-tiers');

    if (tickEl) tickEl.textContent = Math.floor(state.tick).toString();
    if (speedEl) speedEl.textContent = `${state.speed}x`;
    if (popEl) popEl.textContent = this.formatNumber(stats.totalPopulation);
    if (activeEl) activeEl.textContent = stats.activeTiers.toString();
  }

  // ============================================================================
  // HIERARCHY TREE
  // ============================================================================

  private renderTree(): void {
    // Throttle tree rendering to once per second to prevent DOM thrashing
    const now = Date.now();
    if (now - this.lastTreeRenderTime < 1000) return;
    this.lastTreeRenderTime = now;

    const treeEl = document.getElementById('hierarchy-tree');
    if (!treeEl) return;

    const state = this.controller.getState();
    treeEl.innerHTML = this.renderTierNode(state.rootTier, 0);
  }

  private renderTierNode(tier: AbstractTier, depth: number): string {
    const indent = depth * 20;
    const isSelected = this.selectedTier?.id === tier.id;
    const selectedClass = isSelected ? ' class="selected"' : '';

    const icon = this.getTierIcon(tier.tier);
    const population = this.formatNumber(tier.population.total);
    const stability = Math.floor(tier.stability.overall);
    const isActive = this.controller.isTierActive(tier.id);
    const modeIcon = isActive ? '🔴' : '⚪';
    const modeTitle = isActive ? 'Active (full simulation)' : 'Abstract (statistical)';
    const timeScale = TIME_SCALE[tier.tier] || 1;
    const timeLabel = this.formatTimeScale(timeScale);

    let html = `
      <div${selectedClass} style="padding-left: ${indent}px; cursor: pointer; padding: 4px; ${isSelected ? 'background: #333;' : ''}"
           data-tier-id="${tier.id}">
        <span title="${modeTitle}">${modeIcon}</span>
        ${icon} <strong>${tier.name}</strong>
        <span style="color: #888; font-size: 0.9em;">
          | Pop: ${population} | Stab: ${stability}%
        </span>
        <span style="color: #666; font-size: 0.75em; margin-left: 4px;" title="Time scale: ${timeScale}x">
          (${timeLabel})
        </span>
        <span style="float: right;">
          <button class="zoom-btn" data-action="zoom-in" data-tier-id="${tier.id}" title="Zoom In (activate)" style="font-size: 0.7em; padding: 2px 4px; margin-left: 4px;">🔍+</button>
          <button class="zoom-btn" data-action="zoom-out" data-tier-id="${tier.id}" title="Zoom Out (summarize)" style="font-size: 0.7em; padding: 2px 4px;">🔍-</button>
        </span>
      </div>
    `;

    for (const child of tier.children) {
      html += this.renderTierNode(child, depth + 1);
    }

    return html;
  }

  private formatTimeScale(scale: number): string {
    if (scale === 1) return 'real-time';
    if (scale === 60) return '1hr/tick';
    if (scale === 1440) return '1day/tick';
    if (scale === 10080) return '1wk/tick';
    if (scale === 43200) return '1mo/tick';
    if (scale === 525600) return '1yr/tick';
    return `${scale}x`;
  }

  private getTierIcon(tier: string): string {
    const icons: Record<string, string> = {
      gigasegment: '🌌',
      megasegment: '🌠',
      subsection: '🏙️',
      region: '🏘️',
      zone: '🏠',
      chunk: '⬜',
      tile: '·'
    };
    return icons[tier] || '?';
  }

  // ============================================================================
  // EVENT LOG
  // ============================================================================

  private renderEventLog(): void {
    const logEl = document.getElementById('event-log');
    if (!logEl) return;

    const state = this.controller.getState();
    const recentEvents = [...state.allEvents].reverse().slice(0, 20);

    logEl.innerHTML = recentEvents.map(event => {
      const eventClass = this.getEventClass(event.type);
      const tierName = this.findTierName(event.tier);

      return `
        <div class="event-entry ${eventClass}">
          <div class="event-header">
            <span>${event.type.replace(/_/g, ' ').toUpperCase()}</span>
            <span class="event-severity">Severity ${event.severity}</span>
          </div>
          <div class="event-description">
            ${tierName}: ${event.description}
          </div>
        </div>
      `;
    }).join('');
  }

  private getEventClass(type: string): string {
    if (type.includes('breakthrough') || type.includes('discovery') || type.includes('boom')) {
      return 'event-positive';
    }
    if (type.includes('disaster') || type.includes('shortage') || type.includes('failure') || type.includes('pandemic') || type.includes('unrest')) {
      return 'event-negative';
    }
    return 'event-neutral';
  }

  private findTierName(tierId: string): string {
    const tier = this.controller.getTierById(tierId);
    return tier?.name || 'Unknown';
  }

  // ============================================================================
  // DETAIL PANEL
  // ============================================================================

  private renderDetailPanel(): void {
    const titleEl = document.getElementById('detail-title');
    const subtitleEl = document.getElementById('detail-subtitle');
    const gridEl = document.getElementById('detail-grid');

    if (!titleEl || !subtitleEl || !gridEl) return;

    if (!this.selectedTier) {
      titleEl.textContent = 'Select a tier to view details';
      subtitleEl.textContent = 'Click on any node in the hierarchy tree';
      gridEl.innerHTML = '';
      return;
    }

    const tier = this.selectedTier;
    const scale = TIER_SCALES[tier.tier];

    // Update title and subtitle
    titleEl.textContent = `${this.getTierIcon(tier.tier)} ${tier.name}`;
    subtitleEl.textContent = `${scale.label} | Pop: ${this.formatNumber(tier.population.total)} | Stability: ${Math.floor(tier.stability.overall)}%`;

    // Build detail cards
    gridEl.innerHTML = `

      <h4>Population</h4>
      <div class="stat-row">
        <span>Total:</span>
        <span>${this.formatNumber(tier.population.total)}</span>
      </div>
      <div class="stat-row">
        <span>Growth Rate:</span>
        <span>${this.formatNumber(tier.population.growth)}/tick</span>
      </div>
      <div class="stat-row">
        <span>Carrying Capacity:</span>
        <span>${this.formatNumber(tier.population.carryingCapacity)}</span>
      </div>

      <h4>Stability</h4>
      ${this.renderStabilityBar('Overall', tier.stability.overall)}
      ${this.renderStabilityBar('Economic', tier.stability.economic)}
      ${this.renderStabilityBar('Social', tier.stability.social)}
      ${this.renderStabilityBar('Infrastructure', tier.stability.infrastructure)}
      ${this.renderStabilityBar('Happiness', tier.stability.happiness)}

      <h4>Technology</h4>
      <div class="stat-row">
        <span>Level:</span>
        <span>${tier.tech.level}/10</span>
      </div>
      <div class="stat-row">
        <span>Research Progress:</span>
        <span>${Math.floor(tier.tech.research)}%</span>
      </div>
      <div class="stat-row">
        <span>Efficiency Bonus:</span>
        <span>+${Math.floor((tier.tech.efficiency - 1) * 100)}%</span>
      </div>

      <h4>Research Infrastructure</h4>
      <div class="stat-row">
        <span>Universities:</span>
        <span>${tier.universities}</span>
      </div>
      <div class="stat-row">
        <span>Research Guilds:</span>
        <span>${tier.researchGuilds.size} fields</span>
      </div>
      <div class="stat-row">
        <span>Total Scientists:</span>
        <span>${this.getTotalScientists(tier)}</span>
      </div>

      <h4>Trade</h4>
      <div class="stat-row">
        <span>Active Routes:</span>
        <span>${tier.tradeRoutes.filter(r => r.active).length}</span>
      </div>
      <div class="stat-row">
        <span>Transport Hubs:</span>
        <span>${tier.transportHubs.length}</span>
      </div>

      <h4>Resources</h4>
      ${Array.from(tier.economy.stockpiles.entries()).map(([resource, stock]) => {
        const production = tier.economy.production.get(resource) || 0;
        const consumption = tier.economy.consumption.get(resource) || 0;
        const netChange = production - consumption;
        const changeColor = netChange > 0 ? '#0f0' : netChange < 0 ? '#f00' : '#888';

        return `
          <div class="stat-row" style="font-size: 0.85em;">
            <span>${resource}:</span>
            <span>
              ${this.formatNumber(stock)}
              <span style="color: ${changeColor}; margin-left: 4px;">
                ${netChange >= 0 ? '+' : ''}${this.formatNumber(netChange)}/t
              </span>
            </span>
          </div>
        `;
      }).join('')}

      ${this.renderBeliefSection(tier)}

      <h4>Simulation Mode</h4>
      <div class="stat-row">
        <span>Mode:</span>
        <span style="color: ${tier.mode === 'active' ? '#0f0' : '#888'};">
          ${tier.mode === 'active' ? '🔴 Active (Full ECS)' : '⚪ Abstract (Statistical)'}
        </span>
      </div>
      <div class="stat-row">
        <span>Time Scale:</span>
        <span>${this.formatTimeScale(TIME_SCALE[tier.tier] || 1)}</span>
      </div>
      <div class="stat-row">
        <span>Tick Multiplier:</span>
        <span>${TIME_SCALE[tier.tier] || 1}x</span>
      </div>
    `;
  }

  private renderStabilityBar(label: string, value: number): string {
    const color = value > 75 ? '#0f0' : value > 50 ? '#ff0' : value > 25 ? '#f80' : '#f00';
    return `
      <div style="margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.85em; margin-bottom: 2px;">
          <span>${label}</span>
          <span>${Math.floor(value)}%</span>
        </div>
        <div class="stability-bar">
          <div class="stability-fill" style="width: ${value}%; background-color: ${color};"></div>
        </div>
      </div>
    `;
  }

  private renderBeliefSection(tier: AbstractTier): string {
    const summary = this.controller.getTierSummary(tier.id);
    if (!summary) {
      return `
        <h4>Belief & Faith</h4>
        <div class="stat-row" style="color: #666;">
          <span>No belief data available</span>
        </div>
      `;
    }

    const beliefData = summary.belief;
    const deities = Array.from(beliefData.byDeity.entries());

    let deityList = '';
    if (deities.length === 0) {
      deityList = '<div class="stat-row" style="color: #666;"><span>No deities worshipped</span></div>';
    } else {
      deityList = deities.map(([deityId, stats]) => {
        const faithPct = (stats.faithDensity * 100).toFixed(1);
        const templeCount = stats.temples;
        const miracleCount = stats.recentMiracles;

        return `
          <div class="stat-row" style="font-size: 0.85em; margin-bottom: 4px;">
            <span>⛪ ${stats.deityName || deityId}</span>
            <span>
              ${this.formatNumber(stats.believers)} believers (${faithPct}%)
              ${templeCount > 0 ? `| 🏛️${templeCount}` : ''}
              ${miracleCount > 0 ? `| ✨${miracleCount}` : ''}
            </span>
          </div>
        `;
      }).join('');
    }

    return `
      <h4>Belief & Faith</h4>
      <div class="stat-row">
        <span>Total Believers:</span>
        <span>${this.formatNumber(beliefData.totalBelievers)}</span>
      </div>
      <div class="stat-row">
        <span>Belief Density:</span>
        <span>${(beliefData.beliefDensity * 100).toFixed(1)}%</span>
      </div>
      <div class="stat-row">
        <span>Dominant Deity:</span>
        <span style="color: #ff0;">${beliefData.dominantDeity || 'None'}</span>
      </div>
      <div style="margin-top: 8px;">
        <strong style="font-size: 0.85em; color: #888;">Deities:</strong>
        ${deityList}
      </div>
    `;
  }

  private getTotalScientists(tier: AbstractTier): string {
    let total = 0;
    for (const count of tier.scientistPool.values()) {
      total += count;
    }
    return this.formatNumber(total);
  }

  // ============================================================================
  // CHARTS
  // ============================================================================

  private initializeCharts(): void {
    this.populationChart = this.createChart('population-chart', 'Population', 'rgba(75, 192, 192, 1)');
    this.productionChart = this.createChart('production-chart', 'Production/Consumption', 'rgba(255, 206, 86, 1)', 'rgba(255, 99, 132, 1)');
    this.tradeChart = this.createChart('trade-chart', 'Trade Routes', 'rgba(153, 102, 255, 1)');
    this.efficiencyChart = this.createChart('efficiency-chart', 'Economic Efficiency', 'rgba(255, 159, 64, 1)');
  }

  private createChart(canvasId: string, label: string, color1: string, color2?: string): Chart | null {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return null;

    const datasets: any[] = [
      {
        label,
        data: [],
        borderColor: color1,
        backgroundColor: color1.replace('1)', '0.2)'),
        fill: true
      }
    ];

    if (color2) {
      datasets.push({
        label: label.split('/')[1] || 'Secondary',
        data: [],
        borderColor: color2,
        backgroundColor: color2.replace('1)', '0.2)'),
        fill: true
      });
    }

    return new Chart(canvas, {
      type: 'line',
      data: {
        labels: [],
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { display: false },
          y: { beginAtZero: true }
        },
        plugins: {
          legend: { display: true }
        }
      }
    });
  }

  private renderCharts(): void {
    const history = this.controller.getHistory();

    if (this.populationChart) {
      this.populationChart.data.labels = history.ticks.map(t => Math.floor(t).toString());
      this.populationChart.data.datasets[0].data = history.population;
      this.populationChart.update('none'); // No animation for performance
    }

    if (this.productionChart) {
      this.productionChart.data.labels = history.ticks.map(t => Math.floor(t).toString());
      this.productionChart.data.datasets[0].data = history.production;
      this.productionChart.data.datasets[1].data = history.consumption;
      this.productionChart.update('none');
    }

    if (this.tradeChart) {
      this.tradeChart.data.labels = history.ticks.map(t => Math.floor(t).toString());
      this.tradeChart.data.datasets[0].data = history.tradeVolume;
      this.tradeChart.update('none');
    }

    if (this.efficiencyChart) {
      this.efficiencyChart.data.labels = history.ticks.map(t => Math.floor(t).toString());
      this.efficiencyChart.data.datasets[0].data = history.efficiency;
      this.efficiencyChart.update('none');
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Set up click handler for tier selection and zoom buttons
   */
  setupTierSelection(): void {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Handle zoom buttons
      if (target.classList.contains('zoom-btn')) {
        e.stopPropagation();
        const action = target.dataset.action;
        const tierId = target.dataset.tierId;
        if (!tierId) return;

        if (action === 'zoom-in') {
          const constraints = this.controller.zoomIn(tierId);
          if (constraints) {
            console.log(`[Zoom In] ${tierId}: Target pop ${constraints.targetPopulation}, Tech ${constraints.techLevel}`);
          }
        } else if (action === 'zoom-out') {
          const summary = this.controller.zoomOut(tierId);
          if (summary) {
            console.log(`[Zoom Out] ${tierId}: Pop ${summary.population}, Believers ${summary.belief.totalBelievers}`);
          }
        }
        return;
      }

      // Handle tier selection
      const tierEl = target.closest('[data-tier-id]') as HTMLElement;
      if (!tierEl) return;

      const tierId = tierEl.dataset.tierId;
      if (!tierId) return;

      const tier = this.controller.getTierById(tierId);
      this.setSelectedTier(tier);
    });
  }

  // ============================================================================
  // UTILS
  // ============================================================================

  private formatNumber(num: number): string {
    if (num >= 1e15) return (num / 1e15).toFixed(1) + 'Q';
    if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    if (Number.isInteger(num)) return num.toString();
    return num.toFixed(2);
  }
}
