/**
 * DivineActionsPalette - Quick access to common divine actions
 *
 * Features:
 * - Right-side floating palette
 * - Context-sensitive actions based on selection
 * - Quick access to common actions (Send Vision, Miracle, Bless, etc.)
 * - Energy cost display
 * - Cooldown indicators
 *
 * See: specs/divine-systems-ui.md
 */

import { DivineEnergy, DIVINE_COLORS } from './DivineUITypes.js';

export type ActionContext = 'none' | 'agent' | 'location' | 'prayer' | 'site' | 'angel';

export interface DivineAction {
  id: string;
  name: string;
  icon: string;
  description: string;
  energyCost: number;
  cooldownMs: number;
  contexts: ActionContext[];
  tier: 'minor' | 'moderate' | 'major' | 'supreme';
}

export interface DivineActionsPaletteCallbacks {
  onActionClick: (actionId: string, context: ActionContext) => void;
  onActionHover: (actionId: string | null) => void;
}

export interface DivineActionsPaletteState {
  energy: DivineEnergy;
  currentContext: ActionContext;
  selectedEntityId: string | null;
  cooldowns: Map<string, number>; // Action ID -> end timestamp
  enabled: boolean;
}

const DEFAULT_ACTIONS: DivineAction[] = [
  // Minor actions
  { id: 'whisper', name: 'Divine Whisper', icon: '\u{1F4AC}', description: 'Send a subtle message', energyCost: 5, cooldownMs: 60000, contexts: ['agent', 'prayer'], tier: 'minor' },
  { id: 'nudge', name: 'Gentle Nudge', icon: '\u{1F449}', description: 'Guide towards something', energyCost: 10, cooldownMs: 30000, contexts: ['agent'], tier: 'minor' },
  { id: 'comfort', name: 'Comfort', icon: '\u{1F495}', description: 'Ease suffering briefly', energyCost: 15, cooldownMs: 45000, contexts: ['agent', 'prayer'], tier: 'minor' },

  // Moderate actions
  { id: 'vision', name: 'Send Vision', icon: '\u{1F441}\uFE0F', description: 'Send a dream or vision', energyCost: 50, cooldownMs: 300000, contexts: ['agent', 'prayer'], tier: 'moderate' },
  { id: 'bless_area', name: 'Bless Area', icon: '\u{2728}', description: 'Bless a location', energyCost: 75, cooldownMs: 600000, contexts: ['location', 'site'], tier: 'moderate' },
  { id: 'reveal', name: 'Reveal Path', icon: '\u{1F6E4}\uFE0F', description: 'Show the way', energyCost: 40, cooldownMs: 120000, contexts: ['agent'], tier: 'moderate' },

  // Major actions
  { id: 'miracle', name: 'Minor Miracle', icon: '\u{1F31F}', description: 'Perform a small miracle', energyCost: 200, cooldownMs: 1800000, contexts: ['agent', 'prayer', 'location'], tier: 'major' },
  { id: 'consecrate', name: 'Consecrate', icon: '\u{26EA}', description: 'Create a sacred site', energyCost: 500, cooldownMs: 3600000, contexts: ['location'], tier: 'major' },
  { id: 'smite', name: 'Divine Judgment', icon: '\u{26A1}', description: 'Strike with divine wrath', energyCost: 300, cooldownMs: 7200000, contexts: ['agent', 'location'], tier: 'major' },

  // Supreme actions
  { id: 'grand_miracle', name: 'Grand Miracle', icon: '\u{1F4AB}', description: 'Reshape reality', energyCost: 1000, cooldownMs: 86400000, contexts: ['location', 'agent'], tier: 'supreme' },
  { id: 'ascend', name: 'Ascension', icon: '\u{1F47C}', description: 'Elevate to angel', energyCost: 2000, cooldownMs: 604800000, contexts: ['agent'], tier: 'supreme' },
];

const SIZES = {
  width: 180,
  buttonHeight: 44,
  padding: 8,
  iconSize: 20,
  rightMargin: 16,
  topOffset: 100,
  headerHeight: 36,
  tooltipWidth: 200,
};

const TIER_COLORS: Record<string, string> = {
  minor: '#4CAF50',
  moderate: '#2196F3',
  major: '#FF9800',
  supreme: '#9C27B0',
};

/**
 * DivineActionsPalette - Renders a quick action palette on the right side
 */
export class DivineActionsPalette {
  private state: DivineActionsPaletteState;
  private callbacks: DivineActionsPaletteCallbacks;
  private visible: boolean = true;
  private hoveredAction: string | null = null;
  private actions: DivineAction[] = DEFAULT_ACTIONS;

  constructor(
    initialState: DivineActionsPaletteState,
    callbacks: DivineActionsPaletteCallbacks
  ) {
    this.state = initialState;
    this.callbacks = callbacks;
  }

  /**
   * Show the palette
   */
  show(): void {
    this.visible = true;
  }

  /**
   * Hide the palette
   */
  hide(): void {
    this.visible = false;
  }

  /**
   * Check if visible
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Toggle visibility
   */
  toggle(): void {
    this.visible = !this.visible;
  }

  /**
   * Update state
   */
  updateState(newState: Partial<DivineActionsPaletteState>): void {
    this.state = { ...this.state, ...newState };
  }

  /**
   * Get current state
   */
  getState(): DivineActionsPaletteState {
    return { ...this.state };
  }

  /**
   * Set the current context
   */
  setContext(context: ActionContext, entityId: string | null = null): void {
    this.state.currentContext = context;
    this.state.selectedEntityId = entityId;
  }

  /**
   * Get actions available for current context
   */
  getAvailableActions(): DivineAction[] {
    return this.actions.filter(action =>
      action.contexts.includes(this.state.currentContext) ||
      (this.state.currentContext === 'none' && action.contexts.includes('location'))
    );
  }

  /**
   * Check if an action is on cooldown
   */
  isOnCooldown(actionId: string): boolean {
    const cooldownEnd = this.state.cooldowns.get(actionId);
    return cooldownEnd !== undefined && cooldownEnd > Date.now();
  }

  /**
   * Get remaining cooldown time
   */
  getCooldownRemaining(actionId: string): number {
    const cooldownEnd = this.state.cooldowns.get(actionId);
    if (!cooldownEnd) return 0;
    return Math.max(0, cooldownEnd - Date.now());
  }

  /**
   * Check if player can afford action
   */
  canAfford(action: DivineAction): boolean {
    return this.state.energy.current >= action.energyCost;
  }

  /**
   * Render the palette
   */
  render(ctx: CanvasRenderingContext2D, canvasWidth: number): void {
    if (!this.visible || !this.state.enabled) return;

    const x = canvasWidth - SIZES.width - SIZES.rightMargin;
    let y = SIZES.topOffset;

    // Get available actions for current context
    const availableActions = this.getAvailableActions();

    // Draw background panel
    const panelHeight = SIZES.headerHeight + availableActions.length * (SIZES.buttonHeight + SIZES.padding) + SIZES.padding;

    ctx.fillStyle = 'rgba(20, 20, 30, 0.9)';
    this.roundRect(ctx, x, y, SIZES.width, panelHeight, 8);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = DIVINE_COLORS.primary;
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, SIZES.width, panelHeight, 8);
    ctx.stroke();

    // Draw header
    ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
    ctx.fillRect(x, y, SIZES.width, SIZES.headerHeight);

    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = DIVINE_COLORS.primary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u{26A1} Divine Actions', x + SIZES.width / 2, y + SIZES.headerHeight / 2);

    y += SIZES.headerHeight + SIZES.padding;

    // Draw actions
    availableActions.forEach((action, index) => {
      const buttonY = y + index * (SIZES.buttonHeight + SIZES.padding);
      this.renderActionButton(ctx, action, x + SIZES.padding, buttonY, SIZES.width - SIZES.padding * 2);
    });

    // Draw tooltip if hovering
    if (this.hoveredAction) {
      const action = this.actions.find(a => a.id === this.hoveredAction);
      if (action) {
        const actionIndex = availableActions.findIndex(a => a.id === this.hoveredAction);
        if (actionIndex >= 0) {
          const tooltipY = SIZES.topOffset + SIZES.headerHeight + SIZES.padding +
            actionIndex * (SIZES.buttonHeight + SIZES.padding);
          this.renderTooltip(ctx, action, x - SIZES.tooltipWidth - 8, tooltipY);
        }
      }
    }

    // Reset text alignment
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  /**
   * Render a single action button
   */
  private renderActionButton(
    ctx: CanvasRenderingContext2D,
    action: DivineAction,
    x: number,
    y: number,
    width: number
  ): void {
    const isHovered = this.hoveredAction === action.id;
    const onCooldown = this.isOnCooldown(action.id);
    const canAfford = this.canAfford(action);
    const isEnabled = canAfford && !onCooldown;

    // Button background
    if (onCooldown) {
      ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
    } else if (!canAfford) {
      ctx.fillStyle = 'rgba(60, 60, 60, 0.3)';
    } else if (isHovered) {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
    } else {
      ctx.fillStyle = 'rgba(50, 50, 60, 0.5)';
    }

    this.roundRect(ctx, x, y, width, SIZES.buttonHeight, 6);
    ctx.fill();

    // Tier indicator (left border)
    ctx.fillStyle = TIER_COLORS[action.tier] ?? '#888888';
    ctx.fillRect(x, y + 6, 3, SIZES.buttonHeight - 12);

    // Hover border
    if (isHovered && isEnabled) {
      ctx.strokeStyle = DIVINE_COLORS.primary;
      ctx.lineWidth = 1;
      this.roundRect(ctx, x, y, width, SIZES.buttonHeight, 6);
      ctx.stroke();
    }

    // Icon
    ctx.font = `${SIZES.iconSize}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isEnabled ? '#FFFFFF' : '#666666';
    ctx.fillText(action.icon, x + 10, y + SIZES.buttonHeight / 2);

    // Name
    ctx.font = '11px sans-serif';
    ctx.fillStyle = isEnabled ? '#FFFFFF' : '#666666';
    ctx.fillText(action.name, x + 10 + SIZES.iconSize + 8, y + SIZES.buttonHeight / 2 - 6);

    // Cost
    ctx.font = '10px sans-serif';
    ctx.fillStyle = canAfford ? DIVINE_COLORS.secondary : DIVINE_COLORS.critical;
    ctx.fillText(`${action.energyCost} \u{26A1}`, x + 10 + SIZES.iconSize + 8, y + SIZES.buttonHeight / 2 + 8);

    // Cooldown overlay
    if (onCooldown) {
      const remaining = this.getCooldownRemaining(action.id);
      const cooldownPercent = remaining / action.cooldownMs;

      // Draw cooldown sweep
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(x, y, width * cooldownPercent, SIZES.buttonHeight);

      // Cooldown text
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#FF6666';
      ctx.textAlign = 'right';
      ctx.fillText(this.formatCooldown(remaining), x + width - 8, y + SIZES.buttonHeight / 2);
    }
  }

  /**
   * Render tooltip for action
   */
  private renderTooltip(
    ctx: CanvasRenderingContext2D,
    action: DivineAction,
    x: number,
    y: number
  ): void {
    const tooltipHeight = 70;

    // Background
    ctx.fillStyle = 'rgba(30, 30, 40, 0.95)';
    this.roundRect(ctx, x, y, SIZES.tooltipWidth, tooltipHeight, 6);
    ctx.fill();

    // Border
    ctx.strokeStyle = TIER_COLORS[action.tier] ?? '#888888';
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, SIZES.tooltipWidth, tooltipHeight, 6);
    ctx.stroke();

    // Title
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = TIER_COLORS[action.tier] ?? '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(action.name, x + 8, y + 8);

    // Description
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText(action.description, x + 8, y + 26);

    // Cost and cooldown
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#888888';
    ctx.fillText(`Cost: ${action.energyCost} energy`, x + 8, y + 44);
    ctx.fillText(`Cooldown: ${this.formatCooldown(action.cooldownMs)}`, x + 8, y + 56);
  }

  /**
   * Helper to draw rounded rectangle
   */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Format cooldown duration
   */
  private formatCooldown(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  /**
   * Handle mouse move for hover effects
   */
  handleMouseMove(x: number, y: number, canvasWidth: number): void {
    if (!this.visible || !this.state.enabled) {
      this.hoveredAction = null;
      this.callbacks.onActionHover(null);
      return;
    }

    const paletteX = canvasWidth - SIZES.width - SIZES.rightMargin;
    const availableActions = this.getAvailableActions();

    // Check if within palette area
    if (x < paletteX || x > paletteX + SIZES.width) {
      this.hoveredAction = null;
      this.callbacks.onActionHover(null);
      return;
    }

    // Check each action button
    for (let i = 0; i < availableActions.length; i++) {
      const buttonY = SIZES.topOffset + SIZES.headerHeight + SIZES.padding +
        i * (SIZES.buttonHeight + SIZES.padding);

      if (
        y >= buttonY &&
        y <= buttonY + SIZES.buttonHeight
      ) {
        const hoveredAction = availableActions[i];
        if (hoveredAction && this.hoveredAction !== hoveredAction.id) {
          this.hoveredAction = hoveredAction.id;
          this.callbacks.onActionHover(hoveredAction.id);
        }
        return;
      }
    }

    this.hoveredAction = null;
    this.callbacks.onActionHover(null);
  }

  /**
   * Handle click on palette
   * Returns true if click was handled
   */
  handleClick(x: number, y: number, canvasWidth: number): boolean {
    if (!this.visible || !this.state.enabled) return false;

    const paletteX = canvasWidth - SIZES.width - SIZES.rightMargin;
    const availableActions = this.getAvailableActions();

    // Check if within palette area
    if (x < paletteX || x > paletteX + SIZES.width) {
      return false;
    }

    // Check each action button
    for (let i = 0; i < availableActions.length; i++) {
      const buttonY = SIZES.topOffset + SIZES.headerHeight + SIZES.padding +
        i * (SIZES.buttonHeight + SIZES.padding);

      if (
        y >= buttonY &&
        y <= buttonY + SIZES.buttonHeight
      ) {
        const action = availableActions[i];
        if (!action) continue;

        // Check if action can be used
        if (this.canAfford(action) && !this.isOnCooldown(action.id)) {
          this.callbacks.onActionClick(action.id, this.state.currentContext);
          return true;
        }
        return true; // Still consume the click
      }
    }

    return false;
  }

  /**
   * Check if a point is within the palette area
   */
  isPointInArea(x: number, canvasWidth: number): boolean {
    if (!this.visible || !this.state.enabled) return false;

    const paletteX = canvasWidth - SIZES.width - SIZES.rightMargin;
    return x >= paletteX && x <= paletteX + SIZES.width;
  }
}
