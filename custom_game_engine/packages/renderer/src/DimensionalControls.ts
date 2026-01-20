/**
 * UI controls for interacting with dimensional buildings.
 * Provides W-slice slider, phase indicator, quantum collapse button, etc.
 */
export class DimensionalControls {
  private container: HTMLDivElement;
  private wSlider: HTMLInputElement | null = null;
  private wLabel: HTMLSpanElement | null = null;
  private collapseButton: HTMLButtonElement | null = null;
  private phaseIndicator: HTMLSpanElement | null = null;

  constructor() {
    // Create UI container
    this.container = document.createElement('div');
    this.container.id = 'dimensional-controls';
    this.container.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      padding: 10px 20px;
      border-radius: 8px;
      color: white;
      font-family: monospace;
      display: none;
      z-index: 1000;
    `;
    document.body.appendChild(this.container);
  }

  /**
   * Show W-axis slider for 4D buildings.
   */
  showWSlider(currentSlice: number, maxSlices: number, onChange: (slice: number) => void): void {
    this.hideAll();
    this.container.style.display = 'block';

    const label = document.createElement('label');
    label.textContent = 'W-Slice: ';

    this.wSlider = document.createElement('input');
    this.wSlider.type = 'range';
    this.wSlider.min = '0';
    this.wSlider.max = String(maxSlices - 1);
    this.wSlider.value = String(currentSlice);
    this.wSlider.style.width = '200px';
    this.wSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      onChange(value);
      if (this.wLabel) {
        this.wLabel.textContent = `Slice ${value + 1} of ${maxSlices}`;
      }
    });

    this.wLabel = document.createElement('span');
    this.wLabel.textContent = `Slice ${currentSlice + 1} of ${maxSlices}`;
    this.wLabel.style.marginLeft = '10px';

    this.container.appendChild(label);
    this.container.appendChild(this.wSlider);
    this.container.appendChild(this.wLabel);
  }

  /**
   * Show phase indicator for 5D buildings.
   */
  showPhaseIndicator(currentPhase: number, maxPhases: number): void {
    this.hideAll();
    this.container.style.display = 'block';

    this.phaseIndicator = document.createElement('span');
    this.phaseIndicator.textContent = `Phase ${currentPhase + 1}/${maxPhases} (Shifting)`;
    this.phaseIndicator.style.cssText = 'color: #FF00FF; font-weight: bold;';

    this.container.appendChild(this.phaseIndicator);
  }

  /**
   * Update phase indicator value.
   */
  updatePhaseIndicator(currentPhase: number, maxPhases: number): void {
    if (this.phaseIndicator) {
      this.phaseIndicator.textContent = `Phase ${currentPhase + 1}/${maxPhases} (Shifting)`;
    }
  }

  /**
   * Show quantum collapse button for 6D buildings.
   */
  showQuantumControls(isCollapsed: boolean, onCollapse: () => void): void {
    this.hideAll();
    this.container.style.display = 'block';

    const status = document.createElement('span');
    status.textContent = isCollapsed ? 'Quantum State: Collapsed' : 'Quantum State: Superposed';
    status.style.cssText = isCollapsed ? 'color: #00FF00;' : 'color: #FFFF00;';

    this.collapseButton = document.createElement('button');
    this.collapseButton.textContent = isCollapsed ? 'Reset' : 'Observe (Collapse)';
    this.collapseButton.style.cssText = `
      margin-left: 15px;
      padding: 5px 10px;
      background: #4444FF;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    this.collapseButton.addEventListener('click', onCollapse);

    this.container.appendChild(status);
    this.container.appendChild(this.collapseButton);
  }

  /**
   * Hide all controls.
   */
  hideAll(): void {
    this.container.innerHTML = '';
    this.container.style.display = 'none';
    this.wSlider = null;
    this.wLabel = null;
    this.collapseButton = null;
    this.phaseIndicator = null;
  }

  /**
   * Clean up and remove from DOM.
   */
  destroy(): void {
    this.container.remove();
  }
}
