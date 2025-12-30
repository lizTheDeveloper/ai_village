/**
 * ControlsView - Keyboard shortcuts and game controls reference
 *
 * Shows all available controls organized by category.
 * Accessibility-first: clear descriptions of how to interact with the game.
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
  ViewState,
} from '../types.js';

/**
 * A control/keybinding entry
 */
interface ControlEntry {
  key: string;
  description: string;
}

/**
 * A category of controls
 */
interface ControlCategory {
  name: string;
  controls: ControlEntry[];
}

/**
 * Data returned by the Controls view
 */
export interface ControlsViewData extends ViewData {
  /** All control categories */
  categories: ControlCategory[];
  /** Dynamic window shortcuts (from WindowManager if available) */
  windowShortcuts: ControlEntry[];
}

/**
 * Built-in control categories
 */
const BUILT_IN_CONTROLS: ControlCategory[] = [
  {
    name: 'Camera',
    controls: [
      { key: 'WASD / Arrows', description: 'Pan the camera around the map' },
      { key: 'Mouse Drag', description: 'Pan camera by dragging' },
      { key: 'Scroll / +/-', description: 'Zoom in and out' },
    ],
  },
  {
    name: 'Selection',
    controls: [
      { key: 'Left Click', description: 'Select an agent, animal, or building' },
      { key: 'Right Click', description: 'Inspect the tile under cursor' },
    ],
  },
  {
    name: 'Time',
    controls: [
      { key: '1 / 2 / 3 / 4', description: 'Set game speed to 1x, 2x, 4x, or 8x' },
      { key: 'Space', description: 'Pause or resume the game' },
    ],
  },
  {
    name: 'Building',
    controls: [
      { key: 'B', description: 'Open the building menu' },
      { key: 'Escape', description: 'Cancel current building placement' },
    ],
  },
  {
    name: 'Farming',
    controls: [
      { key: 'T', description: 'Till the selected soil tile' },
      { key: 'W', description: 'Water the selected tile' },
      { key: 'F', description: 'Fertilize the selected tile' },
    ],
  },
];

/**
 * Controls View Definition
 */
export const ControlsView: DashboardView<ControlsViewData> = {
  id: 'controls',
  title: 'Keyboard Shortcuts',
  category: 'settings',
  keyboardShortcut: 'H',
  description: 'Reference guide for all keyboard shortcuts and controls',

  defaultSize: {
    width: 300,
    height: 500,
    minWidth: 280,
    minHeight: 400,
  },

  createInitialState(): ViewState {
    return { scrollOffset: 0 };
  },

  getData(_context: ViewContext): ControlsViewData {
    // Controls are mostly static, but we could read window shortcuts
    // from WindowManager if it were passed in context

    // For now, return built-in controls
    // TODO: In Phase 4, add dynamic window shortcuts from WindowManager
    return {
      timestamp: Date.now(),
      available: true,
      categories: BUILT_IN_CONTROLS,
      windowShortcuts: [
        // These would ideally come from WindowManager
        { key: 'I', description: 'Agent Info panel' },
        { key: 'R', description: 'Resources panel' },
        { key: 'E', description: 'Economy panel' },
        { key: 'M', description: 'Memory panel' },
        { key: 'G', description: 'Governance panel' },
        { key: 'H', description: 'This help panel' },
      ],
    };
  },

  textFormatter(data: ControlsViewData): string {
    const lines: string[] = [
      'KEYBOARD SHORTCUTS & CONTROLS',
      '═'.repeat(50),
      '',
      'This guide explains how to interact with the game.',
      '',
    ];

    // Window shortcuts first
    if (data.windowShortcuts.length > 0) {
      lines.push('PANELS & WINDOWS');
      lines.push('─'.repeat(50));
      lines.push('Press these keys to open information panels:');
      lines.push('');
      for (const ctrl of data.windowShortcuts) {
        lines.push(`  ${ctrl.key.padEnd(20)} ${ctrl.description}`);
      }
      lines.push('');
    }

    // Built-in categories
    for (const category of data.categories) {
      lines.push(category.name.toUpperCase());
      lines.push('─'.repeat(50));

      for (const ctrl of category.controls) {
        lines.push(`  ${ctrl.key.padEnd(20)} ${ctrl.description}`);
      }
      lines.push('');
    }

    lines.push('TIP: Most panels can be closed by pressing their shortcut key again,');
    lines.push('or by pressing Escape.');

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: ControlsViewData,
    bounds: RenderBounds,
    theme: RenderTheme
  ): void {
    const { x, y, height } = bounds;
    const { padding, lineHeight } = theme.spacing;

    ctx.font = theme.fonts.normal;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + padding;

    // Helper to draw category header
    const drawHeader = (text: string, color: string) => {
      ctx.fillStyle = color;
      ctx.font = theme.fonts.bold;
      ctx.fillText(text, x + padding, currentY);
      currentY += lineHeight + 4;
      ctx.font = theme.fonts.normal;
    };

    // Helper to draw control
    const drawControl = (key: string, desc: string) => {
      ctx.fillStyle = theme.colors.accent;
      ctx.font = theme.fonts.bold;
      ctx.fillText(key, x + padding, currentY);

      const keyWidth = ctx.measureText(key).width;
      ctx.fillStyle = theme.colors.textMuted;
      ctx.font = theme.fonts.normal;
      ctx.fillText(` - ${desc}`, x + padding + keyWidth, currentY);
      currentY += lineHeight;
    };

    // Window shortcuts
    if (data.windowShortcuts.length > 0 && currentY < y + height - 50) {
      drawHeader('Windows:', '#00BFFF');
      for (const ctrl of data.windowShortcuts.slice(0, 6)) {
        if (currentY > y + height - 30) break;
        drawControl(ctrl.key, ctrl.description);
      }
      currentY += 8;
    }

    // Built-in categories
    const categoryColors = ['#00CED1', '#9370DB', '#FFB347', '#8B4513', '#228B22'];
    for (let i = 0; i < data.categories.length && currentY < y + height - 50; i++) {
      const category = data.categories[i]!;
      drawHeader(`${category.name}:`, categoryColors[i % categoryColors.length]!);

      for (const ctrl of category.controls) {
        if (currentY > y + height - 30) break;
        drawControl(ctrl.key, ctrl.description);
      }
      currentY += 8;
    }

    // Footer hint
    ctx.fillStyle = theme.colors.textMuted;
    ctx.font = '11px monospace';
    ctx.fillText('Press H to close', x + padding, y + height - 20);
  },

  handleScroll(deltaY: number, contentHeight: number, state: ViewState): boolean {
    const maxScroll = Math.max(0, 800 - contentHeight); // Estimated content height
    const oldOffset = state.scrollOffset || 0;
    state.scrollOffset = Math.max(0, Math.min(oldOffset + deltaY * 0.5, maxScroll));
    return state.scrollOffset !== oldOffset;
  },
};
