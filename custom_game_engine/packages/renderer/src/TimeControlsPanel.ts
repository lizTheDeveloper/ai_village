import type { IWindowPanel } from './types/WindowTypes.js';
import type { World, Entity } from '@ai-village/core';

// Component interface for type safety
interface TimeComponent {
  timeOfDay: number;
  day: number;
  phase: string;
  speedMultiplier: number;
  _savedSpeed?: number;
}

/**
 * TimeControlsPanel - Visual controls for time speed and pause/play
 *
 * Provides UI for:
 * - Current time/day display
 * - Speed control buttons (1x, 2x, 4x, 8x)
 * - Pause/play toggle
 * - Current phase indicator (dawn/day/dusk/night)
 */
export class TimeControlsPanel implements IWindowPanel {
  private visible: boolean = false;
  private isPaused: boolean = false;

  // Button layout
  private readonly buttonHeight = 32;
  private readonly buttonPadding = 8;
  private readonly speedButtons = [
    { speed: 1, label: '1x' },
    { speed: 2, label: '2x' },
    { speed: 4, label: '4x' },
    { speed: 8, label: '8x' },
  ];

  constructor() {}

  getId(): string {
    return 'time-controls';
  }

  getTitle(): string {
    return 'Time Controls';
  }

  getDefaultWidth(): number {
    return 220;
  }

  getDefaultHeight(): number {
    return 180;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  render(
    ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    width: number,
    _height: number,
    world?: World
  ): void {
    if (!this.visible || !world) {
      return;
    }

    // Get time component
    const timeEntities = world.query().with('time').executeEntities();
    const timeEntity = timeEntities.length > 0 ? timeEntities[0] : null;
    const timeComp = timeEntity?.components.get('time') as TimeComponent | undefined;

    if (!timeComp) {
      ctx.fillStyle = '#999';
      ctx.font = '12px monospace';
      ctx.fillText('No time system active', 12, 30);
      return;
    }

    const padding = 12;
    let y = padding;

    // === TIME DISPLAY ===
    const hours = Math.floor(timeComp.timeOfDay);
    const minutes = Math.floor((timeComp.timeOfDay % 1) * 60);
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    const dayStr = `Day ${timeComp.day}`;

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(timeStr, padding, y);
    y += 22;

    ctx.fillStyle = '#AAA';
    ctx.font = '12px monospace';
    ctx.fillText(dayStr, padding, y);
    y += 18;

    // === PHASE INDICATOR ===
    const phaseColors: Record<string, string> = {
      dawn: '#FFB6C1',
      day: '#87CEEB',
      dusk: '#FF8C00',
      night: '#191970',
    };
    const phaseColor = phaseColors[timeComp.phase] || '#666';
    const phaseLabel = timeComp.phase.charAt(0).toUpperCase() + timeComp.phase.slice(1);

    ctx.fillStyle = phaseColor;
    ctx.fillRect(padding, y, 40, 14);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(phaseLabel, padding + 4, y + 11);

    y += 22;

    // === SPEED CONTROLS HEADER ===
    ctx.fillStyle = '#00CED1';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('Speed:', padding, y);
    y += 18;

    // === SPEED BUTTONS ===
    const currentSpeed = this.isPaused ? 0 : timeComp.speedMultiplier;
    const buttonWidth = (width - (padding * 2) - (this.buttonPadding * 3)) / 4;

    this.speedButtons.forEach((btn, index) => {
      const x = padding + (index * (buttonWidth + this.buttonPadding));
      const isActive = currentSpeed === btn.speed;

      // Button background
      ctx.fillStyle = isActive ? '#00CED1' : '#333';
      ctx.fillRect(x, y, buttonWidth, this.buttonHeight);

      // Button border
      ctx.strokeStyle = isActive ? '#00FFFF' : '#555';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, buttonWidth, this.buttonHeight);

      // Button label
      ctx.fillStyle = isActive ? '#000' : '#CCC';
      ctx.font = 'bold 14px monospace';
      const textWidth = ctx.measureText(btn.label).width;
      ctx.fillText(btn.label, x + (buttonWidth - textWidth) / 2, y + 21);
    });

    y += this.buttonHeight + 12;

    // === PAUSE/PLAY BUTTON ===
    const pauseButtonY = y;
    const pauseButtonWidth = width - (padding * 2);
    const pauseLabel = this.isPaused ? '▶ Play' : '⏸ Pause';

    ctx.fillStyle = this.isPaused ? '#4CAF50' : '#FF9800';
    ctx.fillRect(padding, pauseButtonY, pauseButtonWidth, this.buttonHeight);

    ctx.strokeStyle = this.isPaused ? '#66BB6A' : '#FFB74D';
    ctx.lineWidth = 2;
    ctx.strokeRect(padding, pauseButtonY, pauseButtonWidth, this.buttonHeight);

    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px monospace';
    const pauseLabelWidth = ctx.measureText(pauseLabel).width;
    ctx.fillText(pauseLabel, padding + (pauseButtonWidth - pauseLabelWidth) / 2, pauseButtonY + 21);

    // === KEYBOARD HINTS ===
    y += this.buttonHeight + 14;
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.fillText('Keys: 1-4 for speed, Space to pause', padding, y);
  }

  /**
   * Handle clicks on speed buttons and pause/play
   */
  handleContentClick(x: number, y: number, width: number, _height: number, world?: World): boolean {
    if (!this.visible || !world) {
      return false;
    }

    const timeEntities = world.query().with('time').executeEntities();
    const timeEntity = timeEntities.length > 0 ? timeEntities[0] : null;
    const timeComp = timeEntity?.components.get('time') as TimeComponent | undefined;

    if (!timeComp || !timeEntity) {
      return false;
    }

    const padding = 12;
    const buttonWidth = (width - (padding * 2) - (this.buttonPadding * 3)) / 4;

    // Speed buttons Y position (after time display)
    const speedButtonsY = padding + 22 + 18 + 22 + 18; // time + day + phase + header

    // Check speed buttons
    if (y >= speedButtonsY && y <= speedButtonsY + this.buttonHeight) {
      for (let i = 0; i < this.speedButtons.length; i++) {
        const btnX = padding + (i * (buttonWidth + this.buttonPadding));
        if (x >= btnX && x <= btnX + buttonWidth) {
          const speedBtn = this.speedButtons[i];
          if (!speedBtn || speedBtn.speed === undefined) continue;

          const speed = speedBtn.speed;
          if ('updateComponent' in timeEntity && typeof timeEntity.updateComponent === 'function') {
            timeEntity.updateComponent('time', (current: TimeComponent) => ({
              ...current,
              speedMultiplier: speed,
            }));
          }

          // Unpause if paused
          if (this.isPaused) {
            this.isPaused = false;
          }

          return true;
        }
      }
    }

    // Pause/play button
    const pauseButtonY = speedButtonsY + this.buttonHeight + 12;
    const pauseButtonWidth = width - (padding * 2);

    if (y >= pauseButtonY && y <= pauseButtonY + this.buttonHeight) {
      if (x >= padding && x <= padding + pauseButtonWidth) {
        this.isPaused = !this.isPaused;

        // Store previous speed and set to 0, or restore previous speed
        if ('updateComponent' in timeEntity && typeof timeEntity.updateComponent === 'function') {
          if (this.isPaused) {
            timeEntity.updateComponent('time', (current: TimeComponent) => ({
              ...current,
              _savedSpeed: current.speedMultiplier,
              speedMultiplier: 0,
            }));
          } else {
            timeEntity.updateComponent('time', (current: TimeComponent) => ({
              ...current,
              speedMultiplier: current._savedSpeed || 1,
            }));
          }
        }

        return true;
      }
    }

    return false;
  }

  /**
   * Handle Space key for pause/play toggle
   */
  handleKeyPress(key: string, world?: World): boolean {
    if (!this.visible || !world) {
      return false;
    }

    if (key === ' ' || key === 'Space') {
      const timeEntities = world.query().with('time').executeEntities();
      const timeEntity = timeEntities.length > 0 ? timeEntities[0] : null;

      if (!timeEntity) {
        return false;
      }

      this.isPaused = !this.isPaused;

      if ('updateComponent' in timeEntity && typeof timeEntity.updateComponent === 'function') {
        if (this.isPaused) {
          timeEntity.updateComponent('time', (current: TimeComponent) => ({
            ...current,
            _savedSpeed: current.speedMultiplier,
            speedMultiplier: 0,
          }));
        } else {
          timeEntity.updateComponent('time', (current: TimeComponent) => ({
            ...current,
            speedMultiplier: current._savedSpeed || 1,
          }));
        }
      }

      return true;
    }

    return false;
  }
}
