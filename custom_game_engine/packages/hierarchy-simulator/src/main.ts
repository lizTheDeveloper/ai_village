/**
 * Hierarchy Simulator - Main Entry Point
 *
 * Follows introspection pattern:
 * - SimulationController: Owns data, runs game loop
 * - HierarchyDOMRenderer: Renders UI from controller data
 *
 * This file just wires them together.
 */

import { Chart, registerables } from 'chart.js';
import { SimulationController } from './simulation/SimulationController.js';
import { HierarchyDOMRenderer } from './renderers/HierarchyDOMRenderer.js';

// Register Chart.js components
Chart.register(...registerables);

class HierarchySimulatorApp {
  private controller: SimulationController;
  private renderer: HierarchyDOMRenderer;

  constructor() {
    // Create data controller
    this.controller = new SimulationController(5); // 5-level hierarchy

    // Create renderer
    this.renderer = new HierarchyDOMRenderer(this.controller);

    // Wire up UI
    this.setupControls();
    this.renderer.setupTierSelection();
    this.renderer.initialize();

    // Start simulation
    this.controller.start();
  }

  private setupControls(): void {
    // Pause/Resume
    document.getElementById('pause-btn')?.addEventListener('click', () => {
      const running = this.controller.togglePause();
      const btn = document.getElementById('pause-btn');
      if (btn) {
        btn.textContent = running ? 'Pause' : 'Resume';
      }
    });

    // Reset
    document.getElementById('reset-btn')?.addEventListener('click', () => {
      this.controller.reset(5);
    });

    // Speed controls
    document.getElementById('speed-slow')?.addEventListener('click', () => {
      this.setSpeed(1);
    });

    document.getElementById('speed-normal')?.addEventListener('click', () => {
      this.setSpeed(10);
    });

    document.getElementById('speed-fast')?.addEventListener('click', () => {
      this.setSpeed(100);
    });

    // Set initial speed indicator
    this.setSpeed(10);
  }

  private setSpeed(speed: number): void {
    this.controller.setSpeed(speed);

    // Update UI
    document.querySelectorAll('.speed-control button').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeBtn = speed === 1 ? 'speed-slow' : speed === 10 ? 'speed-normal' : 'speed-fast';
    document.getElementById(activeBtn)?.classList.add('active');
  }
}

// Start app when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new HierarchySimulatorApp();
});
