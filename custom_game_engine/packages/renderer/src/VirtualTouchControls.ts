export interface VirtualTouchCallbacks {
  onMenuToggle: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onInteract: () => void;
  onJackOut: () => void;
  /** Navigate to next ship section (discrete zoom) */
  onSectionNext?: () => void;
  /** Navigate to previous ship section (discrete zoom) */
  onSectionPrev?: () => void;
  /** Zoom out to ship overview */
  onSectionOverview?: () => void;
  // Sound
  onSoundToggle?: () => void;
  // Time controls
  onPauseToggle: () => void;
  onSpeedChange: (speed: number) => void;
  // Context actions
  onWaterTile?: () => void;
  onFertilizeTile?: () => void;
  onBuildMode?: () => void;
  onViewToggle?: () => void;
  /** Toggle the panel drawer (bottom sheet showing available panels) */
  onPanelDrawerToggle?: () => void;
  /** Open a specific panel by ID */
  onPanelOpen?: (panelId: string) => void;
  /** Go back to previous panel (mobile stack navigation) */
  onMobileBack?: () => void;
}

interface JoystickState {
  active: boolean;
  pointerId: number;
  centerX: number;
  centerY: number;
  dirX: number;
  dirY: number;
}

const JOYSTICK_BASE_RADIUS = 60; // 120px diameter / 2
const JOYSTICK_THUMB_RADIUS = 25; // 50px diameter / 2
const JOYSTICK_MAX_TRAVEL = JOYSTICK_BASE_RADIUS - JOYSTICK_THUMB_RADIUS;

const CSS = `
.vtc-container {
  position: fixed;
  inset: 0;
  z-index: 10000;
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
}

.vtc-joystick-base {
  position: absolute;
  bottom: calc(24px + env(safe-area-inset-bottom));
  left: calc(24px + env(safe-area-inset-left));
  width: ${JOYSTICK_BASE_RADIUS * 2}px;
  height: ${JOYSTICK_BASE_RADIUS * 2}px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.4);
  pointer-events: auto;
  touch-action: none;
}

.vtc-joystick-thumb {
  position: absolute;
  width: ${JOYSTICK_THUMB_RADIUS * 2}px;
  height: ${JOYSTICK_THUMB_RADIUS * 2}px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  border: 2px solid rgba(255, 255, 255, 0.9);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  transition: opacity 0.1s;
}

.vtc-right-controls {
  position: absolute;
  bottom: calc(24px + env(safe-area-inset-bottom));
  right: calc(24px + env(safe-area-inset-right));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  pointer-events: none;
}

.vtc-zoom-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.vtc-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.4);
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  font-family: system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  touch-action: manipulation;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  line-height: 1;
}

.vtc-btn:active {
  background: rgba(255, 255, 255, 0.2);
}

.vtc-btn-label {
  font-size: 10px;
  font-weight: normal;
  opacity: 0.8;
  margin-top: 2px;
}

.vtc-action-btns {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  pointer-events: none;
}

.vtc-menu-btn {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  right: calc(12px + env(safe-area-inset-right));
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  pointer-events: auto;
  touch-action: manipulation;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.vtc-hamburger-line {
  width: 20px;
  height: 2px;
  background: #fff;
  border-radius: 1px;
}

.vtc-sound-btn {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  right: calc(68px + env(safe-area-inset-right));
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  touch-action: manipulation;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  color: #fff;
  font-size: 20px;
}

.vtc-time-bar {
  position: absolute;
  top: calc(52px + env(safe-area-inset-top));
  left: calc(12px + env(safe-area-inset-left));
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 4px 8px;
  pointer-events: auto;
  touch-action: manipulation;
}

.vtc-time-pause-btn {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  flex-shrink: 0;
}

.vtc-time-pause-btn:active {
  background: rgba(255, 255, 255, 0.2);
}

.vtc-time-speed-btn {
  min-width: 44px;
  height: 44px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  font-family: system-ui, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  white-space: nowrap;
}

.vtc-time-speed-btn:active {
  background: rgba(255, 255, 255, 0.2);
}

.vtc-context-actions {
  position: absolute;
  bottom: calc(24px + env(safe-area-inset-bottom) + 120px + 16px);
  left: calc(24px + env(safe-area-inset-left));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.vtc-panels-btn {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  right: calc(124px + env(safe-area-inset-right));
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  touch-action: manipulation;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  color: #fff;
  font-size: 20px;
}

.vtc-back-btn {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  left: calc(12px + env(safe-area-inset-left));
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  touch-action: manipulation;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  color: #fff;
  font-size: 22px;
}

.vtc-panel-drawer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 60vh;
  background: rgba(20, 20, 20, 0.95);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px 16px 0 0;
  padding: 12px 0 calc(12px + env(safe-area-inset-bottom));
  pointer-events: auto;
  touch-action: pan-y;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  transform: translateY(100%);
  transition: transform 0.25s ease-out;
  z-index: 1;
}

.vtc-panel-drawer.vtc-panel-drawer--open {
  transform: translateY(0);
}

.vtc-panel-drawer-handle {
  width: 40px;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  margin: 0 auto 12px;
}

.vtc-panel-drawer-item {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  color: #fff;
  font-size: 16px;
  font-family: system-ui, sans-serif;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.vtc-panel-drawer-item:active {
  background: rgba(255, 255, 255, 0.1);
}
`;

const SPEED_STEPS = [1, 2, 4, 8] as const;
type SpeedStep = typeof SPEED_STEPS[number];

export class VirtualTouchControls {
  readonly isTouchDevice: boolean;

  private readonly container: HTMLDivElement;
  private readonly styleEl: HTMLStyleElement;
  private readonly joystickBase: HTMLDivElement;
  private readonly joystickThumb: HTMLDivElement;
  private readonly actionBtns: HTMLDivElement;

  private readonly timeBar: HTMLDivElement;
  private readonly timePauseBtn: HTMLDivElement;
  private readonly timeSpeedBtn: HTMLDivElement;
  private readonly contextActions: HTMLDivElement;
  private readonly soundBtn: HTMLDivElement;
  private readonly backBtn: HTMLDivElement;
  private readonly panelDrawer: HTMLDivElement;
  private _drawerOpen = false;
  private _onPanelOpen?: (id: string) => void;

  private _paused = false;
  private _currentSpeed: number = 1;
  private _speedStepIndex = 0;

  private readonly joystick: JoystickState = {
    active: false,
    pointerId: -1,
    centerX: 0,
    centerY: 0,
    dirX: 0,
    dirY: 0,
  };

  private readonly boundPointerDown: (e: PointerEvent) => void;
  private readonly boundPointerMove: (e: PointerEvent) => void;
  private readonly boundPointerUp: (e: PointerEvent) => void;

  constructor(callbacks: VirtualTouchCallbacks) {
    this.isTouchDevice =
      'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Inject CSS
    this.styleEl = document.createElement('style');
    this.styleEl.textContent = CSS;
    document.head.appendChild(this.styleEl);

    // Root container
    this.container = document.createElement('div');
    this.container.className = 'vtc-container';

    if (!this.isTouchDevice) {
      this.container.style.display = 'none';
    }

    // --- Joystick ---
    this.joystickBase = document.createElement('div');
    this.joystickBase.className = 'vtc-joystick-base';

    this.joystickThumb = document.createElement('div');
    this.joystickThumb.className = 'vtc-joystick-thumb';
    this.joystickBase.appendChild(this.joystickThumb);

    // --- Menu button ---
    const menuBtn = document.createElement('div');
    menuBtn.className = 'vtc-menu-btn';
    for (let i = 0; i < 3; i++) {
      const line = document.createElement('div');
      line.className = 'vtc-hamburger-line';
      menuBtn.appendChild(line);
    }

    // --- Sound toggle button ---
    this.soundBtn = document.createElement('div');
    this.soundBtn.className = 'vtc-sound-btn';
    this.soundBtn.textContent = '🔇';
    if (callbacks.onSoundToggle) {
      const soundToggle = callbacks.onSoundToggle;
      this.soundBtn.addEventListener('pointerup', (e: PointerEvent) => {
        e.preventDefault();
        soundToggle();
      }, { passive: false });
    }

    // --- Panels button ---
    const panelsBtn = document.createElement('div');
    panelsBtn.className = 'vtc-panels-btn';
    panelsBtn.textContent = '⊞';
    if (callbacks.onPanelDrawerToggle) {
      panelsBtn.addEventListener('pointerup', (e: PointerEvent) => {
        e.preventDefault();
        this.toggleDrawer();
        callbacks.onPanelDrawerToggle!();
      }, { passive: false });
    } else {
      panelsBtn.addEventListener('pointerup', (e: PointerEvent) => {
        e.preventDefault();
        this.toggleDrawer();
      }, { passive: false });
    }

    // --- Back button ---
    this.backBtn = document.createElement('div');
    this.backBtn.className = 'vtc-back-btn';
    this.backBtn.textContent = '←';
    this.backBtn.style.display = 'none';
    if (callbacks.onMobileBack) {
      const mobileBack = callbacks.onMobileBack;
      this.backBtn.addEventListener('pointerup', (e: PointerEvent) => {
        e.preventDefault();
        mobileBack();
      }, { passive: false });
    }

    // --- Panel drawer ---
    this._onPanelOpen = callbacks.onPanelOpen;
    this.panelDrawer = document.createElement('div');
    this.panelDrawer.className = 'vtc-panel-drawer';
    const drawerHandle = document.createElement('div');
    drawerHandle.className = 'vtc-panel-drawer-handle';
    this.panelDrawer.appendChild(drawerHandle);

    // --- Right side controls ---
    const rightControls = document.createElement('div');
    rightControls.className = 'vtc-right-controls';

    // Zoom / section navigation buttons
    const zoomControls = document.createElement('div');
    zoomControls.className = 'vtc-zoom-controls';

    if (callbacks.onSectionNext && callbacks.onSectionPrev && callbacks.onSectionOverview) {
      // Section-based discrete navigation (mobile ship view)
      const sectionUpBtn = this.makeButton('▲', 'Deck', callbacks.onSectionPrev);
      const overviewBtn = this.makeButton('⊞', 'Ship', callbacks.onSectionOverview);
      const sectionDownBtn = this.makeButton('▼', 'Deck', callbacks.onSectionNext);
      zoomControls.appendChild(sectionUpBtn);
      zoomControls.appendChild(overviewBtn);
      zoomControls.appendChild(sectionDownBtn);
    } else {
      // Fallback: standard zoom buttons
      const zoomInBtn = this.makeButton('+', '', callbacks.onZoomIn);
      const zoomOutBtn = this.makeButton('−', '', callbacks.onZoomOut);
      zoomControls.appendChild(zoomInBtn);
      zoomControls.appendChild(zoomOutBtn);
    }

    // Action buttons (possession controls)
    this.actionBtns = document.createElement('div');
    this.actionBtns.className = 'vtc-action-btns';
    this.actionBtns.style.display = 'none';

    const interactBtn = this.makeButton('E', 'Interact', callbacks.onInteract);
    const jackOutBtn = this.makeButton('✕', 'Exit', callbacks.onJackOut);
    this.actionBtns.appendChild(interactBtn);
    this.actionBtns.appendChild(jackOutBtn);

    rightControls.appendChild(zoomControls);
    rightControls.appendChild(this.actionBtns);

    // --- Time controls bar ---
    this.timeBar = document.createElement('div');
    this.timeBar.className = 'vtc-time-bar';

    this.timePauseBtn = document.createElement('div');
    this.timePauseBtn.className = 'vtc-time-pause-btn';
    this.timePauseBtn.textContent = '▶';
    this.timePauseBtn.addEventListener('pointerup', (e: PointerEvent) => {
      e.preventDefault();
      callbacks.onPauseToggle();
    }, { passive: false });

    this.timeSpeedBtn = document.createElement('div');
    this.timeSpeedBtn.className = 'vtc-time-speed-btn';
    this.timeSpeedBtn.textContent = '1x';
    this.timeSpeedBtn.addEventListener('pointerup', (e: PointerEvent) => {
      e.preventDefault();
      this._speedStepIndex = (this._speedStepIndex + 1) % SPEED_STEPS.length;
      const nextSpeed = SPEED_STEPS[this._speedStepIndex] as SpeedStep;
      callbacks.onSpeedChange(nextSpeed);
    }, { passive: false });

    this.timeBar.appendChild(this.timePauseBtn);
    this.timeBar.appendChild(this.timeSpeedBtn);

    // --- Context action buttons ---
    this.contextActions = document.createElement('div');
    this.contextActions.className = 'vtc-context-actions';
    this.contextActions.style.display = 'none';

    if (callbacks.onWaterTile) {
      const waterBtn = this.makeButton('💧', 'Water', callbacks.onWaterTile);
      this.contextActions.appendChild(waterBtn);
    }
    if (callbacks.onFertilizeTile) {
      const fertilizeBtn = this.makeButton('🌱', 'Fertilize', callbacks.onFertilizeTile);
      this.contextActions.appendChild(fertilizeBtn);
    }
    if (callbacks.onBuildMode) {
      const buildBtn = this.makeButton('🏗️', 'Build', callbacks.onBuildMode);
      this.contextActions.appendChild(buildBtn);
    }
    if (callbacks.onViewToggle) {
      const viewBtn = this.makeButton('👁️', 'View', callbacks.onViewToggle);
      this.contextActions.appendChild(viewBtn);
    }

    // Assemble
    this.container.appendChild(this.joystickBase);
    this.container.appendChild(menuBtn);
    this.container.appendChild(this.soundBtn);
    this.container.appendChild(panelsBtn);
    this.container.appendChild(this.backBtn);
    this.container.appendChild(this.panelDrawer);
    this.container.appendChild(this.timeBar);
    this.container.appendChild(this.contextActions);
    this.container.appendChild(rightControls);
    document.body.appendChild(this.container);

    // Pointer handlers
    this.boundPointerDown = (e: PointerEvent) => this.onPointerDown(e);
    this.boundPointerMove = (e: PointerEvent) => this.onPointerMove(e);
    this.boundPointerUp = (e: PointerEvent) => this.onPointerUp(e);

    this.joystickBase.addEventListener('pointerdown', this.boundPointerDown, {
      passive: false,
    });
    this.joystickBase.addEventListener('pointermove', this.boundPointerMove, {
      passive: false,
    });
    this.joystickBase.addEventListener('pointerup', this.boundPointerUp, {
      passive: false,
    });
    this.joystickBase.addEventListener('pointercancel', this.boundPointerUp, {
      passive: false,
    });

    // Menu tap
    menuBtn.addEventListener('pointerup', (e: PointerEvent) => {
      e.preventDefault();
      callbacks.onMenuToggle();
    }, { passive: false });
  }

  private makeButton(
    label: string,
    sublabel: string,
    onClick: () => void
  ): HTMLDivElement {
    const btn = document.createElement('div');
    btn.className = 'vtc-btn';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    btn.appendChild(labelEl);

    if (sublabel) {
      const subEl = document.createElement('span');
      subEl.className = 'vtc-btn-label';
      subEl.textContent = sublabel;
      btn.appendChild(subEl);
    }

    btn.addEventListener('pointerup', (e: PointerEvent) => {
      e.preventDefault();
      onClick();
    }, { passive: false });

    return btn;
  }

  private onPointerDown(e: PointerEvent): void {
    e.preventDefault();

    if (this.joystick.active) {
      return;
    }

    const rect = this.joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    this.joystick.active = true;
    this.joystick.pointerId = e.pointerId;
    this.joystick.centerX = centerX;
    this.joystick.centerY = centerY;

    this.joystickBase.setPointerCapture(e.pointerId);
    this.updateThumbPosition(e.clientX, e.clientY);
  }

  private onPointerMove(e: PointerEvent): void {
    e.preventDefault();

    if (!this.joystick.active) {
      return;
    }

    if (e.pointerId === this.joystick.pointerId) {
      this.updateThumbPosition(e.clientX, e.clientY);
    }
  }

  private onPointerUp(e: PointerEvent): void {
    e.preventDefault();

    if (!this.joystick.active) {
      return;
    }

    if (e.pointerId === this.joystick.pointerId) {
      this.joystickBase.releasePointerCapture(e.pointerId);
      this.resetJoystick();
    }
  }

  private updateThumbPosition(clientX: number, clientY: number): void {
    const dx = clientX - this.joystick.centerX;
    const dy = clientY - this.joystick.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let clampedX = dx;
    let clampedY = dy;

    if (dist > JOYSTICK_MAX_TRAVEL) {
      const scale = JOYSTICK_MAX_TRAVEL / dist;
      clampedX = dx * scale;
      clampedY = dy * scale;
    }

    // Normalized direction (-1 to 1)
    this.joystick.dirX = clampedX / JOYSTICK_MAX_TRAVEL;
    this.joystick.dirY = clampedY / JOYSTICK_MAX_TRAVEL;

    // Visual offset from center of base
    const offsetX = JOYSTICK_BASE_RADIUS + clampedX - JOYSTICK_THUMB_RADIUS;
    const offsetY = JOYSTICK_BASE_RADIUS + clampedY - JOYSTICK_THUMB_RADIUS;
    this.joystickThumb.style.top = `${offsetY}px`;
    this.joystickThumb.style.left = `${offsetX}px`;
    this.joystickThumb.style.transform = 'none';
  }

  private resetJoystick(): void {
    this.joystick.active = false;
    this.joystick.pointerId = -1;
    this.joystick.dirX = 0;
    this.joystick.dirY = 0;

    // Reset thumb to center
    this.joystickThumb.style.top = '50%';
    this.joystickThumb.style.left = '50%';
    this.joystickThumb.style.transform = 'translate(-50%, -50%)';
  }

  getDirection(): { x: number; y: number } {
    return { x: this.joystick.dirX, y: this.joystick.dirY };
  }

  set showPossessionControls(visible: boolean) {
    this.actionBtns.style.display = visible ? 'flex' : 'none';
  }

  set paused(value: boolean) {
    this._paused = value;
    this.timePauseBtn.textContent = value ? '⏸' : '▶';
  }

  set currentSpeed(value: number) {
    this._currentSpeed = value;
    this.timeSpeedBtn.textContent = `${value}x`;
    const idx = SPEED_STEPS.indexOf(value as SpeedStep);
    if (idx !== -1) {
      this._speedStepIndex = idx;
    }
  }

  set soundMuted(muted: boolean) {
    this.soundBtn.textContent = muted ? '🔇' : '🔊';
  }

  set showContextActions(visible: boolean) {
    this.contextActions.style.display = visible ? 'flex' : 'none';
  }

  set showBackButton(visible: boolean) {
    this.backBtn.style.display = visible ? 'flex' : 'none';
  }

  set contextActionSet(actions: 'tile' | 'none') {
    const btns = this.contextActions.querySelectorAll<HTMLDivElement>('.vtc-btn');
    for (const btn of Array.from(btns)) {
      btn.style.display = actions === 'tile' ? 'flex' : 'none';
    }
  }

  /**
   * Set the list of panels available in the drawer.
   */
  setPanelList(panels: Array<{ id: string; title: string }>): void {
    // Clear existing items (keep the handle)
    while (this.panelDrawer.children.length > 1) {
      this.panelDrawer.removeChild(this.panelDrawer.lastChild!);
    }

    for (const panel of panels) {
      const item = document.createElement('div');
      item.className = 'vtc-panel-drawer-item';
      item.textContent = panel.title;
      item.addEventListener('pointerup', (e: PointerEvent) => {
        e.preventDefault();
        this._onPanelOpen?.(panel.id);
        this.toggleDrawer(false);
      }, { passive: false });
      this.panelDrawer.appendChild(item);
    }
  }

  toggleDrawer(open?: boolean): void {
    this._drawerOpen = open ?? !this._drawerOpen;
    if (this._drawerOpen) {
      this.panelDrawer.classList.add('vtc-panel-drawer--open');
    } else {
      this.panelDrawer.classList.remove('vtc-panel-drawer--open');
    }
  }

  destroy(): void {
    this.joystickBase.removeEventListener('pointerdown', this.boundPointerDown);
    this.joystickBase.removeEventListener('pointermove', this.boundPointerMove);
    this.joystickBase.removeEventListener('pointerup', this.boundPointerUp);
    this.joystickBase.removeEventListener('pointercancel', this.boundPointerUp);

    this.container.remove();
    this.styleEl.remove();
  }
}
