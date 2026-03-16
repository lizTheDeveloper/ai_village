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
 * - Current time/day display with solar arc
 * - Speed control buttons (1x, 2x, 4x, 8x) with glow
 * - Pause/play toggle
 * - Current phase indicator with emoji (dawn/day/dusk/night)
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

  private readonly PHASE_EMOJIS: Record<string, string> = {
    dawn: '🌅',
    day: '☀️',
    dusk: '🌆',
    night: '🌙',
  };

  private readonly PHASE_COLORS: Record<string, string> = {
    dawn: '#FF9966',
    day: '#87CEEB',
    dusk: '#FF6B35',
    night: '#3A3A8C',
  };

  private readonly PHASE_TEXT_COLORS: Record<string, string> = {
    dawn: '#FFF',
    day: '#003',
    dusk: '#FFF',
    night: '#DDD',
  };

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
    return 230;
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

    // === SOLAR ARC ===
    // Semicircle arc showing where in the day the sun/moon is (0h=left, 12h=top, 24h=right)
    const arcCenterX = width / 2;
    const arcCenterY = y + 38;
    const arcRadius = (width / 2) - padding - 6;
    const dayFraction = timeComp.timeOfDay / 24; // 0..1
    // Map: 0h → π (left), 12h → 0 (top), 24h → -π (right)
    const sunAngle = Math.PI - dayFraction * Math.PI; // π..0 as time goes 0..12, then 0..-π for 12..24
    const sunX = arcCenterX + arcRadius * Math.cos(sunAngle);
    const sunY = arcCenterY - arcRadius * Math.sin(sunAngle); // minus = upward in canvas coords

    // Arc track
    ctx.beginPath();
    ctx.arc(arcCenterX, arcCenterY, arcRadius, Math.PI, 0, false);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Completed arc (elapsed portion of day)
    const elapsedAngleStart = Math.PI;
    const elapsedAngleEnd = Math.PI - dayFraction * Math.PI;
    if (dayFraction > 0) {
      ctx.beginPath();
      ctx.arc(arcCenterX, arcCenterY, arcRadius, elapsedAngleStart, elapsedAngleEnd, false);
      const isNight = timeComp.phase === 'night';
      ctx.strokeStyle = isNight ? 'rgba(150,150,220,0.6)' : 'rgba(255,220,80,0.7)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Horizon line
    ctx.beginPath();
    ctx.moveTo(arcCenterX - arcRadius - 4, arcCenterY);
    ctx.lineTo(arcCenterX + arcRadius + 4, arcCenterY);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Sun/moon dot — glow then dot
    const isNight = timeComp.phase === 'night';
    const bodyColor = isNight ? '#C8C8FF' : '#FFD700';
    const glowColor = isNight ? 'rgba(180,180,255,0.4)' : 'rgba(255,220,0,0.4)';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 8, 0, Math.PI * 2);
    ctx.fillStyle = glowColor;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sunX, sunY, 5, 0, Math.PI * 2);
    ctx.fillStyle = bodyColor;
    ctx.fill();

    // Time display centred above the arc
    const hours = Math.floor(timeComp.timeOfDay);
    const minutes = Math.floor((timeComp.timeOfDay % 1) * 60);
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(timeStr, arcCenterX, y + 2);
    ctx.textAlign = 'left';

    y = arcCenterY + 10;

    // Day counter + phase pill on same line
    const dayStr = `Day ${timeComp.day}`;
    ctx.fillStyle = '#AAA';
    ctx.font = '11px monospace';
    ctx.fillText(dayStr, padding, y);

    // Phase pill with emoji
    const phaseKey = timeComp.phase;
    const phaseColor = this.PHASE_COLORS[phaseKey] ?? '#555';
    const phaseTextColor = this.PHASE_TEXT_COLORS[phaseKey] ?? '#FFF';
    const phaseEmoji = this.PHASE_EMOJIS[phaseKey] ?? '';
    const phaseLabel = phaseEmoji + ' ' + (phaseKey.charAt(0).toUpperCase() + phaseKey.slice(1));
    ctx.font = 'bold 10px monospace';
    const pillWidth = ctx.measureText(phaseLabel).width + 10;
    const pillX = width - padding - pillWidth;
    const pillY = y - 11;
    // Rounded pill background
    const pillRadius = 5;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillWidth, 14, pillRadius);
    ctx.fillStyle = phaseColor;
    ctx.fill();
    ctx.fillStyle = phaseTextColor;
    ctx.fillText(phaseLabel, pillX + 5, pillY + 11);

    y += 18;

    // === SPEED CONTROLS HEADER ===
    ctx.fillStyle = '#00CED1';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SPEED', padding, y);
    y += 16;

    // === SPEED BUTTONS (rounded, with glow on active) ===
    const currentSpeed = this.isPaused ? 0 : timeComp.speedMultiplier;
    const buttonWidth = (width - (padding * 2) - (this.buttonPadding * 3)) / 4;
    const btnRadius = 5;
    const now = performance.now();

    this.speedButtons.forEach((btn, index) => {
      const bx = padding + (index * (buttonWidth + this.buttonPadding));
      const by = y;
      const isActive = currentSpeed === btn.speed;

      ctx.save();

      if (isActive) {
        // Subtle glow: pulse via sin
        const pulse = 0.5 + 0.25 * Math.sin(now / 400);
        ctx.shadowColor = '#00FFFF';
        ctx.shadowBlur = 8 * pulse;
        ctx.fillStyle = '#00CED1';
      } else {
        ctx.fillStyle = '#2A2A2A';
      }

      ctx.beginPath();
      ctx.roundRect(bx, by, buttonWidth, this.buttonHeight, btnRadius);
      ctx.fill();

      // Border
      ctx.shadowBlur = 0;
      ctx.strokeStyle = isActive ? '#00FFFF' : '#444';
      ctx.lineWidth = isActive ? 1.5 : 1;
      ctx.beginPath();
      ctx.roundRect(bx, by, buttonWidth, this.buttonHeight, btnRadius);
      ctx.stroke();

      ctx.restore();

      // Label
      ctx.fillStyle = isActive ? '#000' : '#AAA';
      ctx.font = isActive ? 'bold 13px monospace' : '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(btn.label, bx + buttonWidth / 2, by + this.buttonHeight / 2 + 5);
    });

    ctx.textAlign = 'left';
    y += this.buttonHeight + 10;

    // === PAUSE/PLAY BUTTON (rounded) ===
    const pauseButtonWidth = width - (padding * 2);
    const pauseLabel = this.isPaused ? '▶  Play' : '⏸  Pause';
    const pauseRadius = 6;

    ctx.save();
    if (this.isPaused) {
      ctx.shadowColor = '#66FF88';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#2E7D32';
    } else {
      ctx.fillStyle = '#5D4037';
    }
    ctx.beginPath();
    ctx.roundRect(padding, y, pauseButtonWidth, this.buttonHeight, pauseRadius);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = this.isPaused ? '#4CAF50' : '#8D6E63';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(padding, y, pauseButtonWidth, this.buttonHeight, pauseRadius);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = this.isPaused ? '#81C784' : '#BCAAA4';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(pauseLabel, padding + pauseButtonWidth / 2, y + this.buttonHeight / 2 + 5);
    ctx.textAlign = 'left';

    // === KEYBOARD HINTS ===
    y += this.buttonHeight + 12;
    ctx.fillStyle = '#555';
    ctx.font = '9px monospace';
    ctx.fillText('1–4 speed  •  Space pause', padding, y);
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
