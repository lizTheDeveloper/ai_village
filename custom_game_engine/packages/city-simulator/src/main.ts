/**
 * City Simulator - Web Dashboard
 *
 * Connects to HeadlessCitySimulator and displays real-time city metrics.
 */

import { HeadlessCitySimulator, type SimulatorStats } from './HeadlessCitySimulator.js';
import type { StrategicPriorities, CityDecision } from '@ai-village/core';

// =============================================================================
// UI CLASS
// =============================================================================

class UI {
  private simulator: HeadlessCitySimulator;
  private updateInterval: number | null = null;

  constructor(simulator: HeadlessCitySimulator) {
    this.simulator = simulator;
    this.setupEventListeners();
    this.setupSimulatorEvents();
    this.update();
  }

  private setupEventListeners(): void {
    const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
    const stepBtn = document.getElementById('step-btn') as HTMLButtonElement;
    const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    const forceDecisionBtn = document.getElementById('force-decision-btn') as HTMLButtonElement;

    startBtn.addEventListener('click', () => {
      this.simulator.start();
      startBtn.disabled = true;
      pauseBtn.disabled = false;
    });

    pauseBtn.addEventListener('click', () => {
      this.simulator.pause();
      startBtn.disabled = false;
      pauseBtn.disabled = true;
    });

    stepBtn.addEventListener('click', () => {
      // Run 1 day worth of ticks
      this.simulator.setSpeed(100);
      this.simulator.start();
      setTimeout(() => {
        this.simulator.pause();
        this.simulator.setSpeed(1);
        startBtn.disabled = false;
        pauseBtn.disabled = true;
      }, 2000);
    });

    resetBtn.addEventListener('click', () => {
      this.simulator.reset();
      startBtn.disabled = false;
      pauseBtn.disabled = true;
      this.update();
    });

    forceDecisionBtn?.addEventListener('click', () => {
      this.simulator.forceDecision();
    });

    // Speed control
    const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    if (speedSlider) {
      speedSlider.addEventListener('input', () => {
        const speed = parseInt(speedSlider.value, 10);
        this.simulator.setSpeed(speed);
        const label = document.getElementById('speed-label');
        if (label) {
          label.textContent = `Speed: ${speed}x`;
        }
      });
    }

    // Manual priority controls
    this.setupPriorityControls();
  }

  private setupPriorityControls(): void {
    const prioritySliders = document.querySelectorAll('.priority-slider');

    // Update value labels and override director when sliders change
    prioritySliders.forEach(slider => {
      slider.addEventListener('input', (e) => {
        const sliderId = (e.target as HTMLInputElement).id;
        const sliderName = sliderId.replace('-slider', '');
        const value = parseFloat((e.target as HTMLInputElement).value);
        const valueLabel = document.getElementById(`${sliderName}-value`);

        if (valueLabel) {
          valueLabel.textContent = `${Math.round(value * 100)}%`;
        }

        // Immediately override director with manual priorities
        const priorities = this.readPriorities();
        this.simulator.setPriorities(priorities);
      });
    });
  }

  private readPriorities(): StrategicPriorities {
    const gathering = parseFloat((document.getElementById('gathering-slider') as HTMLInputElement)?.value ?? '0.2');
    const building = parseFloat((document.getElementById('building-slider') as HTMLInputElement)?.value ?? '0.2');
    const farming = parseFloat((document.getElementById('farming-slider') as HTMLInputElement)?.value ?? '0.2');
    const social = parseFloat((document.getElementById('social-slider') as HTMLInputElement)?.value ?? '0.1');
    const exploration = parseFloat((document.getElementById('exploration-slider') as HTMLInputElement)?.value ?? '0.15');
    const rest = parseFloat((document.getElementById('rest-slider') as HTMLInputElement)?.value ?? '0.1');
    const magic = parseFloat((document.getElementById('magic-slider') as HTMLInputElement)?.value ?? '0.05');

    // Normalize to sum to 1.0
    const sum = gathering + building + farming + social + exploration + rest + magic;
    return {
      gathering: gathering / sum,
      building: building / sum,
      farming: farming / sum,
      social: social / sum,
      exploration: exploration / sum,
      rest: rest / sum,
      magic: magic / sum,
    };
  }

  private setupSimulatorEvents(): void {
    this.simulator.on('tick', () => this.update());
    this.simulator.on('day', (day: number) => {
      // Day event handler
    });
    this.simulator.on('month', (month: number) => {
      // Month event handler
    });
    this.simulator.on('decision', (reasoning: any) => {
      // Decision event handler
    });
  }

  private update(): void {
    const stats = this.simulator.getStats();

    // Update header stats
    (document.getElementById('day') as HTMLElement).textContent = stats.daysElapsed.toString();
    (document.getElementById('ticks') as HTMLElement).textContent = stats.ticksRun.toLocaleString();
    (document.getElementById('tps') as HTMLElement).textContent = Math.round(stats.ticksPerSecond).toString();

    this.renderStats(stats);
    this.renderPriorities(stats);
    this.renderDecisions();
    this.renderRoster(stats);
    this.renderMap();
  }

  private renderStats(stats: SimulatorStats): void {
    const content = document.getElementById('stats-content')!;
    const city = stats.cityStats;

    const foodStatus = city.foodSupply < 3 ? 'status-critical' : city.foodSupply < 7 ? 'status-warning' : 'status-good';

    content.innerHTML = `
      <div style="line-height: 1.8">
        <div><strong>Population:</strong> ${city.population}</div>
        <div><strong>Buildings:</strong> ${city.totalBuildings} (housing: ${city.housingCapacity})</div>
        <div class="${foodStatus}"><strong>Food:</strong> ${city.foodSupply.toFixed(1)} days</div>
        <div><strong>Resources:</strong> ${city.woodSupply.toFixed(0)} wood, ${city.stoneSupply.toFixed(0)} stone</div>
        <div><strong>Threats:</strong> ${city.nearbyThreats} nearby, ${city.recentDeaths} recent deaths</div>
      </div>
    `;
  }

  private renderPriorities(stats: SimulatorStats): void {
    const priorities = stats.cityPriorities;

    // Update sliders and labels with current priorities (unless user is manually dragging)
    Object.entries(priorities).forEach(([name, value]) => {
      const slider = document.getElementById(`${name}-slider`) as HTMLInputElement;
      const label = document.getElementById(`${name}-value`);

      if (slider && label && !slider.matches(':active')) {
        slider.value = value.toString();
        label.textContent = `${Math.round(value * 100)}%`;
      }
    });
  }

  private renderDecisions(): void {
    const cityManager = this.simulator.getCityManager();
    const decisions = cityManager.getDecisionHistory();
    const content = document.getElementById('decisions-content')!;

    if (decisions.length === 0) {
      content.innerHTML = '<div style="color: #888;">No decisions made yet. Waiting for first day...</div>';
      return;
    }

    content.innerHTML = decisions.slice(0, 5).map(d => {
      const day = Math.floor(d.timestamp / 14400);
      return `
        <div class="decision-item">
          <div class="decision-focus">Day ${day}: ${d.reasoning.focus.toUpperCase()}</div>
          <div class="decision-reasoning">${d.reasoning.reasoning}</div>
          ${d.reasoning.concerns.length > 0 ? `<div class="decision-concerns"><strong>Concerns:</strong> ${d.reasoning.concerns.join(', ')}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  private renderRoster(stats: SimulatorStats): void {
    const content = document.getElementById('roster-content')!;
    const city = stats.cityStats;

    content.innerHTML = `
      <div style="line-height: 1.6">
        <div><strong>Total Population:</strong> ${city.population}</div>
        <div style="color: #888; font-size: 0.9rem; margin-top: 0.5rem;">
          Real agents running in headless simulation
        </div>
      </div>
    `;
  }

  private renderMap(): void {
    const mapElement = document.getElementById('city-map')!;
    const world = this.simulator.getWorld();

    // Query all agents
    const agents = world.query().with('position').with('agent').executeEntities();

    // Clear existing dots
    mapElement.innerHTML = '';

    // World is 200x200, map is 600x600
    const scale = 600 / 200;

    // Render agents as dots
    agents.forEach((agent) => {
      const pos = agent.getComponent('position') as any;
      if (!pos) return;

      const dot = document.createElement('div');
      dot.className = 'npc-dot';
      dot.style.left = `${pos.x * scale}px`;
      dot.style.top = `${pos.y * scale}px`;
      mapElement.appendChild(dot);
    });
  }
}

// =============================================================================
// INITIALIZE
// =============================================================================

(async () => {
  // Get preset from URL query param (default: 'basic')
  const params = new URLSearchParams(window.location.search);
  const preset = (params.get('preset') as 'basic' | 'large-city' | 'population-growth') || 'basic';

  const simulator = new HeadlessCitySimulator({
    preset,
    ticksPerBatch: 1,
    autoRun: false,
  });

  await simulator.initialize();

  const ui = new UI(simulator);

  // Expose for debugging
  (window as any).simulator = simulator;
  (window as any).ui = ui;
})();
