/**
 * ExteriorViewScreen - Full-screen HTML overlay showing the ship from outside in space
 *
 * Renders:
 * - Parallax starfield background (3 layers)
 * - Bio-mechanical whale ship hull with bioluminescent glow
 * - Asteroids at configurable density
 * - Shield bubble effect with hit flash
 * - Laser beam firing
 * - Impact/damage indicators
 * - Status HUD overlay
 * - Section detach animation
 */

export interface ExteriorViewCallbacks {
  onReturnToInterior: () => void;
  onFireLaser: (targetX: number, targetY: number) => void;
  onToggleShield: () => void;
  onDetachSection: (sectionId: string) => void;
}

export interface ExteriorHUDData {
  shieldStrength: number;
  hullIntegrity: number;
  asteroidDensity: number;
  laserCharge: number;
  sectionCount: number;
  awarenessState?: 'dormant' | 'scanning' | 'alert' | 'critical';
  heartbeatBpm?: number;
}

export interface ExteriorHeartbeatData {
  awarenessState: 'dormant' | 'scanning' | 'alert' | 'critical';
  awarenessLevel: number;
  cadenceHz: number;
  pulseStrength: number;
  phase: number;
  transitionBoost: number;
}

interface asteroid_entry {
  el: HTMLElement;
  speed: number;
  size: number;
  animationId: number | null;
  startX: number;
  currentX: number;
  y: number;
}

export class ExteriorViewScreen {
  private container: HTMLElement;
  private callbacks: ExteriorViewCallbacks;
  private styleEl: HTMLStyleElement | null = null;
  private starLayers: HTMLElement[] = [];
  private shipHull: HTMLElement | null = null;
  private shieldEl: HTMLElement | null = null;
  private hudEl: HTMLElement | null = null;
  private asteroidContainer: HTMLElement | null = null;
  private asteroids: asteroid_entry[] = [];
  private shieldActive: boolean = false;
  private heartbeatState: 'dormant' | 'scanning' | 'alert' | 'critical' = 'dormant';
  private heartbeatCadenceHz: number = 0.24;
  private heartbeatStrength: number = 0.3;
  private animationFrameIds: number[] = [];
  private asteroidRafId: number | null = null;
  private lastAsteroidTime: number = 0;

  constructor(containerId: string = 'exterior-view-screen', callbacks: ExteriorViewCallbacks) {
    this.callbacks = callbacks;

    const existing = document.getElementById(containerId);
    if (existing) {
      this.container = existing;
    } else {
      this.container = document.createElement('div');
      this.container.id = containerId;
      this.container.className = 'exterior-view-screen';
      this.container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(ellipse at center, #0a0a1a 0%, #000005 100%);
        display: none;
        flex-direction: column;
        z-index: 10000;
        font-family: monospace;
        color: #e0e0e0;
        overflow: hidden;
        cursor: crosshair;
      `;
      document.body.appendChild(this.container);
    }
  }

  show(): void {
    this.container.style.display = 'flex';
    this.injectStyles();
    this.buildScene();
    this.startAsteroidLoop();
  }

  hide(): void {
    this.container.style.display = 'none';
    this.stopAsteroidLoop();
  }

  destroy(): void {
    this.stopAsteroidLoop();
    for (const id of this.animationFrameIds) {
      cancelAnimationFrame(id);
    }
    this.animationFrameIds = [];
    this.asteroids = [];
    if (this.styleEl && this.styleEl.parentNode) {
      this.styleEl.parentNode.removeChild(this.styleEl);
      this.styleEl = null;
    }
    this.container.remove();
  }

  // ---------- Public API ----------

  updateAsteroids(density: number): void {
    const clamped = Math.max(0, Math.min(1, density));
    const target = Math.floor(clamped * 30);
    const container = this.asteroidContainer;
    if (!container) return;

    // Remove excess
    while (this.asteroids.length > target) {
      const entry = this.asteroids.pop();
      if (entry && entry.el.parentNode) {
        entry.el.parentNode.removeChild(entry.el);
      }
    }

    // Add missing
    while (this.asteroids.length < target) {
      const entry = this.spawnAsteroid(container, true);
      this.asteroids.push(entry);
    }
  }

  setShieldActive(active: boolean): void {
    this.shieldActive = active;
    if (!this.shieldEl) return;
    this.shieldEl.style.display = active ? 'block' : 'none';
  }

  setHeartbeat(data: ExteriorHeartbeatData): void {
    this.heartbeatCadenceHz = Math.max(0.15, data.cadenceHz);
    this.heartbeatStrength = Math.max(0, Math.min(1, data.pulseStrength));

    const previousState = this.heartbeatState;
    this.heartbeatState = data.awarenessState;

    if (!this.shipHull) return;

    const heartbeatPeriodSeconds = 1 / this.heartbeatCadenceHz;
    const animationDuration = Math.max(0.4, Math.min(5, heartbeatPeriodSeconds));
    this.shipHull.style.animationDuration = `${animationDuration.toFixed(2)}s`;

    const intensity = Math.max(0.15, Math.min(1, this.heartbeatStrength * 1.25));
    const palette = this.getHeartbeatPalette(this.heartbeatState);
    this.shipHull.style.boxShadow = `
      0 0 ${Math.round(24 + intensity * 32)}px rgba(${palette.outer}, ${0.2 + intensity * 0.22}),
      0 0 ${Math.round(48 + intensity * 72)}px rgba(${palette.mid}, ${0.08 + intensity * 0.2}),
      inset 0 0 ${Math.round(16 + intensity * 20)}px rgba(${palette.inner}, ${0.04 + intensity * 0.12})
    `;

    if (this.shieldEl) {
      this.shieldEl.style.animationDuration = `${Math.max(0.8, animationDuration * 0.85).toFixed(2)}s`;
      this.shieldEl.style.borderColor = `rgba(${palette.mid}, ${0.35 + intensity * 0.35})`;
      this.shieldEl.style.boxShadow = `0 0 ${Math.round(20 + intensity * 30)}px rgba(${palette.mid}, ${0.2 + intensity * 0.2}), inset 0 0 20px rgba(${palette.inner}, 0.12)`;
    }

    if (previousState !== data.awarenessState || data.transitionBoost >= 0.7) {
      this.spawnHeartbeatWave();
    }
  }

  fireLaser(targetX: number, targetY: number): void {
    if (!this.shipHull) return;
    const rect = this.shipHull.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;

    const dx = targetX - originX;
    const dy = targetY - originY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const laser = document.createElement('div');
    laser.style.cssText = `
      position: fixed;
      top: ${originY}px;
      left: ${originX}px;
      width: ${length}px;
      height: 3px;
      background: linear-gradient(90deg, rgba(255, 80, 0, 0.9) 0%, rgba(255, 200, 0, 0.6) 60%, transparent 100%);
      transform-origin: 0 50%;
      transform: rotate(${angle}deg);
      z-index: 10100;
      border-radius: 2px;
      box-shadow: 0 0 8px rgba(255, 100, 0, 0.8), 0 0 16px rgba(255, 60, 0, 0.4);
      animation: laser_fade 500ms ease-out forwards;
      pointer-events: none;
    `;
    document.body.appendChild(laser);

    const timeout = window.setTimeout(() => {
      if (laser.parentNode) {
        laser.parentNode.removeChild(laser);
      }
    }, 500);
    // Store for cleanup awareness (best-effort; short-lived)
    void timeout;
  }

  showImpact(x: number, y: number): void {
    const flash = document.createElement('div');
    const size = 60 + Math.random() * 40;
    flash.style.cssText = `
      position: fixed;
      left: ${x - size / 2}px;
      top: ${y - size / 2}px;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,220,100,1) 0%, rgba(255,80,0,0.7) 40%, transparent 70%);
      z-index: 10200;
      pointer-events: none;
      animation: impact_flash 400ms ease-out forwards;
    `;
    document.body.appendChild(flash);
    window.setTimeout(() => {
      if (flash.parentNode) flash.parentNode.removeChild(flash);
    }, 400);
  }

  showShieldHit(): void {
    if (!this.shieldEl || !this.shieldActive) return;
    this.shieldEl.style.background = 'rgba(200, 240, 255, 0.7)';
    this.shieldEl.style.borderColor = '#ffffff';
    window.setTimeout(() => {
      if (this.shieldEl) {
        this.shieldEl.style.background = 'rgba(0, 180, 255, 0.12)';
        this.shieldEl.style.borderColor = 'rgba(0, 220, 255, 0.5)';
      }
    }, 200);
  }

  showHullDamage(severity: number): void {
    if (!this.shipHull) return;
    const clamped = Math.max(0, Math.min(1, severity));
    const px = Math.floor(clamped * 20);
    const hull = this.shipHull;
    hull.style.animation = `hull_shake_${Math.ceil(clamped * 3)} 400ms ease-out`;
    // Apply via inline keyframes trick: add a unique class for each shake level
    hull.style.transform = `translateX(${px}px)`;
    window.setTimeout(() => {
      hull.style.transform = 'translateX(0)';
      hull.style.animation = 'hull_pulse 2s ease-in-out infinite';
      hull.style.animationDuration = `${Math.max(0.4, Math.min(5, 1 / this.heartbeatCadenceHz)).toFixed(2)}s`;
    }, 400);
  }

  updateHUD(data: ExteriorHUDData): void {
    if (!this.hudEl) return;
    this.hudEl.innerHTML = '';

    const lines: Array<{ label: string; value: number; unit?: string }> = [
      { label: 'SHIELD', value: data.shieldStrength },
      { label: 'HULL  ', value: data.hullIntegrity },
      { label: 'ASTRD ', value: data.asteroidDensity },
      { label: 'LASER ', value: data.laserCharge },
    ];

    for (const line of lines) {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 5px;';

      const labelEl = document.createElement('span');
      labelEl.textContent = line.label;
      labelEl.style.cssText = 'color: #88aacc; font-size: 11px; min-width: 52px;';
      row.appendChild(labelEl);

      const barTrack = document.createElement('div');
      barTrack.style.cssText = `
        width: 80px;
        height: 6px;
        background: rgba(255,255,255,0.1);
        border-radius: 3px;
        overflow: hidden;
      `;
      const barFill = document.createElement('div');
      const pct = Math.floor(line.value * 100);
      let color = '#00e5ff';
      if (line.value < 0.3) color = '#ff4444';
      else if (line.value < 0.6) color = '#ffaa00';
      barFill.style.cssText = `
        width: ${pct}%;
        height: 100%;
        background: ${color};
        border-radius: 3px;
        transition: width 0.3s ease, background 0.3s ease;
      `;
      barTrack.appendChild(barFill);
      row.appendChild(barTrack);

      const valEl = document.createElement('span');
      valEl.textContent = `${pct}%`;
      valEl.style.cssText = 'color: #aaccee; font-size: 10px; min-width: 30px;';
      row.appendChild(valEl);

      this.hudEl.appendChild(row);
    }

    // Section count
    const sectionRow = document.createElement('div');
    sectionRow.style.cssText = 'margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: #88aacc;';
    sectionRow.textContent = `SECTIONS  ${data.sectionCount}`;
    this.hudEl.appendChild(sectionRow);

    const awarenessRow = document.createElement('div');
    awarenessRow.style.cssText = 'margin-top: 4px; font-size: 11px; color: #9fd3ff;';
    const awareness = (data.awarenessState ?? this.heartbeatState).toUpperCase();
    const bpm = Math.max(1, Math.round((data.heartbeatBpm ?? this.heartbeatCadenceHz * 60)));
    awarenessRow.textContent = `AWARE    ${awareness}  ${bpm} BPM`;
    this.hudEl.appendChild(awarenessRow);
  }

  detachSection(sectionName: string): void {
    if (!this.shipHull) return;
    const rect = this.shipHull.getBoundingClientRect();

    const section = document.createElement('div');
    section.style.cssText = `
      position: fixed;
      left: ${rect.left + rect.width * 0.4}px;
      top: ${rect.top + rect.height * 0.3}px;
      width: 40px;
      height: 20px;
      background: linear-gradient(135deg, #2a4a6a 0%, #1a3a5a 100%);
      border: 1px solid rgba(0, 200, 255, 0.4);
      border-radius: 4px;
      z-index: 10150;
      pointer-events: none;
      box-shadow: 0 0 10px rgba(0, 200, 255, 0.3);
    `;

    const label = document.createElement('div');
    label.textContent = sectionName.slice(0, 4).toUpperCase();
    label.style.cssText = 'font-size: 8px; color: #88ccff; text-align: center; line-height: 20px;';
    section.appendChild(label);

    document.body.appendChild(section);

    // Animate drifting away
    const startX = parseFloat(section.style.left);
    const startY = parseFloat(section.style.top);
    const driftX = 150 + Math.random() * 100;
    const driftY = (Math.random() - 0.5) * 80;
    const startTime = performance.now();
    const duration = 2000;

    const animateDetach = (now: number): void => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = t * (2 - t); // ease out quad
      section.style.left = `${startX + driftX * eased}px`;
      section.style.top = `${startY + driftY * eased}px`;
      section.style.opacity = `${1 - eased}`;
      section.style.transform = `rotate(${eased * 45}deg)`;
      if (t < 1) {
        const id = requestAnimationFrame(animateDetach);
        this.animationFrameIds.push(id);
      } else {
        if (section.parentNode) section.parentNode.removeChild(section);
      }
    };

    const id = requestAnimationFrame(animateDetach);
    this.animationFrameIds.push(id);
  }

  // ---------- Scene construction ----------

  private injectStyles(): void {
    if (this.styleEl) return;
    this.styleEl = document.createElement('style');
    this.styleEl.textContent = `
      @keyframes star_drift_far {
        0%   { transform: translateX(0); }
        100% { transform: translateX(-20px); }
      }
      @keyframes star_drift_mid {
        0%   { transform: translateX(0); }
        100% { transform: translateX(-50px); }
      }
      @keyframes star_drift_near {
        0%   { transform: translateX(0); }
        100% { transform: translateX(-120px); }
      }
      @keyframes star_twinkle {
        0%, 100% { opacity: 0.3; }
        50%       { opacity: 1; }
      }
      @keyframes hull_pulse {
        0%, 100% { box-shadow: 0 0 30px rgba(0, 200, 180, 0.3), 0 0 60px rgba(0, 150, 200, 0.15), inset 0 0 20px rgba(0, 180, 200, 0.05); }
        50%       { box-shadow: 0 0 50px rgba(0, 220, 200, 0.5), 0 0 90px rgba(0, 180, 220, 0.25), inset 0 0 30px rgba(0, 200, 220, 0.1); }
      }
      @keyframes shield_flicker {
        0%, 100% { opacity: 0.7; }
        25%       { opacity: 0.5; }
        75%       { opacity: 0.85; }
      }
      @keyframes asteroid_rotate_cw {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
      @keyframes asteroid_rotate_ccw {
        from { transform: rotate(0deg); }
        to   { transform: rotate(-360deg); }
      }
      @keyframes laser_fade {
        0%   { opacity: 1; transform-origin: 0 50%; }
        80%  { opacity: 0.8; }
        100% { opacity: 0; }
      }
      @keyframes impact_flash {
        0%   { opacity: 1; transform: scale(0.3); }
        50%  { opacity: 0.9; transform: scale(1); }
        100% { opacity: 0; transform: scale(1.3); }
      }
      @keyframes heartbeat_ring {
        0%   { opacity: 0.85; transform: translate(-50%, -50%) scale(0.65); }
        70%  { opacity: 0.3; transform: translate(-50%, -50%) scale(1.08); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(1.2); }
      }
    `;
    document.head.appendChild(this.styleEl);
  }

  private buildScene(): void {
    this.container.innerHTML = '';
    this.starLayers = [];
    this.shipHull = null;
    this.shieldEl = null;
    this.hudEl = null;
    this.asteroidContainer = null;
    this.asteroids = [];

    this.buildStarfield();
    this.buildAsteroidContainer();
    this.buildShip();
    this.buildHUD();
    this.buildReturnButton();

    // Wire click-to-fire on container
    this.container.addEventListener('click', (e: MouseEvent) => {
      this.callbacks.onFireLaser(e.clientX, e.clientY);
    });
  }

  private buildStarfield(): void {
    // Layer 1: far, small, dim, slow
    const farLayer = this.createStarLayer(120, 1, 2, 0.15, 0.45, 60);
    farLayer.style.animation = 'star_drift_far 80s linear infinite';
    this.container.appendChild(farLayer);
    this.starLayers.push(farLayer);

    // Layer 2: mid, medium, moderate brightness
    const midLayer = this.createStarLayer(60, 2, 3.5, 0.35, 0.7, 35);
    midLayer.style.animation = 'star_drift_mid 40s linear infinite';
    this.container.appendChild(midLayer);
    this.starLayers.push(midLayer);

    // Layer 3: near, large, bright, fast
    const nearLayer = this.createStarLayer(25, 3, 5, 0.6, 1.0, 15);
    nearLayer.style.animation = 'star_drift_near 18s linear infinite';
    this.container.appendChild(nearLayer);
    this.starLayers.push(nearLayer);
  }

  private createStarLayer(
    count: number,
    minSize: number,
    maxSize: number,
    minOpacity: number,
    maxOpacity: number,
    twinkleDurationBase: number,
  ): HTMLElement {
    const layer = document.createElement('div');
    layer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 200%;
      height: 100%;
      pointer-events: none;
    `;

    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      const size = minSize + Math.random() * (maxSize - minSize);
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const opacity = minOpacity + Math.random() * (maxOpacity - minOpacity);
      const twinkleDuration = twinkleDurationBase * (0.5 + Math.random());
      const twinkleDelay = Math.random() * twinkleDuration;

      star.style.cssText = `
        position: absolute;
        left: ${x}%;
        top: ${y}%;
        width: ${size}px;
        height: ${size}px;
        background: white;
        border-radius: 50%;
        opacity: ${opacity};
        animation: star_twinkle ${twinkleDuration}s ease-in-out ${twinkleDelay}s infinite;
      `;
      layer.appendChild(star);
    }

    return layer;
  }

  private buildAsteroidContainer(): void {
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
    `;
    this.container.appendChild(container);
    this.asteroidContainer = container;
  }

  private spawnAsteroid(container: HTMLElement, randomStart: boolean): asteroid_entry {
    const size = 6 + Math.random() * 28;
    const y = 5 + Math.random() * 90;
    // Larger asteroids move slower (parallax)
    const speed = 0.03 + (1 - size / 34) * 0.12;
    const startX = randomStart ? Math.random() * 110 : 110;
    const rotateDuration = 4 + Math.random() * 12;
    const direction = Math.random() > 0.5 ? 'asteroid_rotate_cw' : 'asteroid_rotate_ccw';
    const brightness = 80 + Math.floor(Math.random() * 60);

    const el = document.createElement('div');
    el.style.cssText = `
      position: absolute;
      left: ${startX}%;
      top: ${y}%;
      width: ${size}px;
      height: ${size * (0.6 + Math.random() * 0.6)}px;
      background: radial-gradient(ellipse at 35% 35%, rgb(${brightness + 30},${brightness + 20},${brightness}) 0%, rgb(${brightness},${brightness - 10},${brightness - 20}) 60%, rgb(${brightness - 30},${brightness - 35},${brightness - 40}) 100%);
      border-radius: ${30 + Math.random() * 40}% ${20 + Math.random() * 40}% ${30 + Math.random() * 40}% ${20 + Math.random() * 40}%;
      animation: ${direction} ${rotateDuration}s linear infinite;
    `;
    container.appendChild(el);

    return {
      el,
      speed,
      size,
      animationId: null,
      startX,
      currentX: startX,
      y,
    };
  }

  private startAsteroidLoop(): void {
    this.lastAsteroidTime = performance.now();
    const loop = (now: number): void => {
      const dt = now - this.lastAsteroidTime;
      this.lastAsteroidTime = now;

      const toRemove: number[] = [];
      for (let i = 0; i < this.asteroids.length; i++) {
        const entry = this.asteroids[i];
        if (!entry) continue;
        entry.currentX -= entry.speed * dt * 0.05;
        entry.el.style.left = `${entry.currentX}%`;
        if (entry.currentX < -5) {
          toRemove.push(i);
        }
      }

      // Remove off-screen and respawn at right
      for (let i = toRemove.length - 1; i >= 0; i--) {
        const rawIdx = toRemove[i];
        if (rawIdx === undefined) continue;
        const idx: number = rawIdx;
        const entry = this.asteroids[idx];
        if (entry && entry.el.parentNode) {
          entry.el.parentNode.removeChild(entry.el);
        }
        this.asteroids.splice(idx, 1);
        if (this.asteroidContainer) {
          const newEntry = this.spawnAsteroid(this.asteroidContainer, false);
          this.asteroids.splice(idx, 0, newEntry);
        }
      }

      this.asteroidRafId = requestAnimationFrame(loop);
    };
    this.asteroidRafId = requestAnimationFrame(loop);
  }

  private stopAsteroidLoop(): void {
    if (this.asteroidRafId !== null) {
      cancelAnimationFrame(this.asteroidRafId);
      this.asteroidRafId = null;
    }
  }

  private buildShip(): void {
    // Ship wrapper (centered)
    const shipWrapper = document.createElement('div');
    shipWrapper.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
    `;

    // Shield bubble (behind hull)
    const shield = document.createElement('div');
    shield.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 340px;
      height: 220px;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background: rgba(0, 180, 255, 0.12);
      border: 2px solid rgba(0, 220, 255, 0.5);
      box-shadow: 0 0 30px rgba(0, 200, 255, 0.2), inset 0 0 20px rgba(0, 200, 255, 0.1);
      display: none;
      animation: shield_flicker 2s ease-in-out infinite;
      pointer-events: none;
      z-index: 1;
    `;
    this.shieldEl = shield;
    shipWrapper.appendChild(shield);

    // Hull body
    const hull = document.createElement('div');
    hull.className = 'ship-hull';
    hull.style.cssText = `
      position: relative;
      width: 280px;
      height: 120px;
      background: linear-gradient(180deg,
        #1a2a3a 0%,
        #0d1e2e 30%,
        #0a1825 60%,
        #07121c 100%
      );
      border-radius: 60% 60% 45% 45% / 55% 55% 35% 35%;
      box-shadow: 0 0 30px rgba(0, 200, 180, 0.3), 0 0 60px rgba(0, 150, 200, 0.15), inset 0 0 20px rgba(0, 180, 200, 0.05);
      animation: hull_pulse ${(1 / this.heartbeatCadenceHz).toFixed(2)}s ease-in-out infinite;
      z-index: 2;
    `;

    // Bio-luminescent accent stripe along the hull
    const accentStripe = document.createElement('div');
    accentStripe.style.cssText = `
      position: absolute;
      top: 28%;
      left: 8%;
      width: 84%;
      height: 3px;
      background: linear-gradient(90deg, transparent 0%, rgba(0,220,200,0.7) 20%, rgba(0,240,220,0.9) 50%, rgba(0,220,200,0.7) 80%, transparent 100%);
      border-radius: 2px;
      filter: blur(1px);
    `;
    hull.appendChild(accentStripe);

    // Lower accent stripe
    const accentStripe2 = document.createElement('div');
    accentStripe2.style.cssText = `
      position: absolute;
      top: 58%;
      left: 15%;
      width: 70%;
      height: 2px;
      background: linear-gradient(90deg, transparent 0%, rgba(0,180,200,0.5) 30%, rgba(0,200,220,0.7) 50%, rgba(0,180,200,0.5) 70%, transparent 100%);
      border-radius: 2px;
      filter: blur(1px);
    `;
    hull.appendChild(accentStripe2);

    // Porthole details
    for (let i = 0; i < 4; i++) {
      const porthole = document.createElement('div');
      porthole.style.cssText = `
        position: absolute;
        top: 38%;
        left: ${22 + i * 18}%;
        width: 14px;
        height: 14px;
        background: radial-gradient(circle, rgba(100, 220, 255, 0.9) 0%, rgba(0, 150, 200, 0.6) 60%, rgba(0, 80, 120, 0.3) 100%);
        border-radius: 50%;
        border: 1px solid rgba(0, 200, 240, 0.4);
        box-shadow: 0 0 6px rgba(0, 200, 255, 0.5);
      `;
      hull.appendChild(porthole);
    }

    // Tail fins
    const leftFin = document.createElement('div');
    leftFin.style.cssText = `
      position: absolute;
      bottom: -18px;
      left: 10%;
      width: 50px;
      height: 22px;
      background: linear-gradient(135deg, #0d1e2e 0%, #07121c 100%);
      border-radius: 0 0 60% 20%;
      transform: skewX(-15deg);
      box-shadow: 0 0 10px rgba(0, 180, 200, 0.15);
    `;
    hull.appendChild(leftFin);

    const rightFin = document.createElement('div');
    rightFin.style.cssText = `
      position: absolute;
      bottom: -18px;
      right: 10%;
      width: 50px;
      height: 22px;
      background: linear-gradient(225deg, #0d1e2e 0%, #07121c 100%);
      border-radius: 0 0 20% 60%;
      transform: skewX(15deg);
      box-shadow: 0 0 10px rgba(0, 180, 200, 0.15);
    `;
    hull.appendChild(rightFin);

    shipWrapper.appendChild(hull);
    this.shipHull = hull;
    this.container.appendChild(shipWrapper);
  }

  private buildHUD(): void {
    const hud = document.createElement('div');
    hud.style.cssText = `
      position: absolute;
      bottom: 24px;
      left: 24px;
      background: rgba(0, 10, 20, 0.75);
      border: 1px solid rgba(0, 180, 220, 0.3);
      border-radius: 6px;
      padding: 12px 16px;
      font-family: monospace;
      font-size: 11px;
      color: #aaccee;
      z-index: 10050;
      min-width: 180px;
      backdrop-filter: blur(4px);
      pointer-events: none;
    `;

    const title = document.createElement('div');
    title.textContent = '// SHIP STATUS //';
    title.style.cssText = 'color: #00ccff; font-size: 10px; letter-spacing: 1px; margin-bottom: 8px;';
    hud.appendChild(title);

    this.hudEl = hud;

    // Default initial data
    this.container.appendChild(hud);
    this.updateHUD({ shieldStrength: 1, hullIntegrity: 1, asteroidDensity: 0, laserCharge: 1, sectionCount: 4 });
  }

  private buildReturnButton(): void {
    const btn = document.createElement('button');
    btn.textContent = '< Return to Ship';
    btn.style.cssText = `
      position: absolute;
      top: 20px;
      right: 24px;
      padding: 10px 20px;
      font-size: 13px;
      font-family: monospace;
      background: rgba(0, 10, 20, 0.8);
      color: #00ccff;
      border: 1px solid rgba(0, 200, 240, 0.4);
      border-radius: 5px;
      cursor: pointer;
      z-index: 10050;
      letter-spacing: 1px;
      transition: background 0.2s, border-color 0.2s, color 0.2s;
      backdrop-filter: blur(4px);
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(0, 60, 90, 0.9)';
      btn.style.borderColor = 'rgba(0, 220, 255, 0.8)';
      btn.style.color = '#ffffff';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(0, 10, 20, 0.8)';
      btn.style.borderColor = 'rgba(0, 200, 240, 0.4)';
      btn.style.color = '#00ccff';
    });
    btn.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      this.callbacks.onReturnToInterior();
    });
    this.container.appendChild(btn);
  }

  private getHeartbeatPalette(state: 'dormant' | 'scanning' | 'alert' | 'critical'): {
    outer: string;
    mid: string;
    inner: string;
  } {
    switch (state) {
      case 'critical':
        return { outer: '255, 120, 120', mid: '255, 90, 90', inner: '255, 70, 70' };
      case 'alert':
        return { outer: '255, 190, 120', mid: '255, 160, 90', inner: '255, 140, 70' };
      case 'scanning':
        return { outer: '130, 230, 255', mid: '90, 210, 255', inner: '80, 190, 230' };
      case 'dormant':
      default:
        return { outer: '110, 180, 210', mid: '90, 160, 200', inner: '70, 140, 180' };
    }
  }

  private spawnHeartbeatWave(): void {
    if (!this.shipHull) return;

    const rect = this.shipHull.getBoundingClientRect();
    const palette = this.getHeartbeatPalette(this.heartbeatState);
    const ring = document.createElement('div');
    ring.style.cssText = `
      position: fixed;
      left: ${rect.left + rect.width / 2}px;
      top: ${rect.top + rect.height / 2}px;
      width: ${Math.round(rect.width * 1.35)}px;
      height: ${Math.round(rect.height * 1.35)}px;
      border-radius: 50%;
      border: 2px solid rgba(${palette.mid}, ${0.45 + this.heartbeatStrength * 0.35});
      box-shadow: 0 0 24px rgba(${palette.outer}, ${0.25 + this.heartbeatStrength * 0.25});
      pointer-events: none;
      z-index: 10120;
      transform: translate(-50%, -50%);
      animation: heartbeat_ring 650ms ease-out forwards;
    `;
    document.body.appendChild(ring);
    window.setTimeout(() => {
      if (ring.parentNode) ring.parentNode.removeChild(ring);
    }, 700);
  }
}
