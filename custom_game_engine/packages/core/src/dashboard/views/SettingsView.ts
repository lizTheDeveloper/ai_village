/**
 * SettingsView - Game and LLM settings
 *
 * Shows configuration options for LLM providers and game behavior.
 * Accessibility-first: describes settings in narrative form.
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
} from '../types.js';

/**
 * LLM provider configuration
 */
interface LLMProviderConfig {
  type: 'ollama' | 'openai-compat' | 'mlx' | 'none';
  name: string;
  endpoint: string;
  model: string;
  isConnected: boolean;
  lastError: string | null;
}

/**
 * Game behavior settings
 */
interface GameBehaviorSettings {
  agentDecisionInterval: number;
  maxConcurrentLLMCalls: number;
  enableAutonomousAgents: boolean;
  dmPromptEnabled: boolean;
  debugMode: boolean;
}

/**
 * Performance settings
 */
interface PerformanceSettings {
  targetFPS: number;
  maxEntities: number;
  renderDistance: number;
  enableParticles: boolean;
}

/**
 * Data returned by the Settings view
 */
export interface SettingsViewData extends ViewData {
  /** LLM provider configuration */
  llmProvider: LLMProviderConfig | null;
  /** Available LLM models */
  availableModels: string[];
  /** Game behavior settings */
  behavior: GameBehaviorSettings;
  /** Performance settings */
  performance: PerformanceSettings;
  /** Audio settings */
  audio: {
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
  };
  /** Accessibility settings */
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
    reducedMotion: boolean;
    screenReaderMode: boolean;
  };
}

/**
 * Settings View Definition
 */
export const SettingsView: DashboardView<SettingsViewData> = {
  id: 'settings',
  title: 'Settings',
  category: 'settings',
  keyboardShortcut: undefined,
  description: 'Configure game, LLM, and accessibility settings',

  defaultSize: {
    width: 400,
    height: 600,
    minWidth: 350,
    minHeight: 500,
  },

  getData(_context: ViewContext): SettingsViewData {
    // Default settings structure
    const defaultData: SettingsViewData = {
      timestamp: Date.now(),
      available: true,
      llmProvider: null,
      availableModels: [],
      behavior: {
        agentDecisionInterval: 5000,
        maxConcurrentLLMCalls: 3,
        enableAutonomousAgents: true,
        dmPromptEnabled: false,
        debugMode: false,
      },
      performance: {
        targetFPS: 60,
        maxEntities: 1000,
        renderDistance: 100,
        enableParticles: true,
      },
      audio: {
        masterVolume: 80,
        musicVolume: 50,
        sfxVolume: 70,
      },
      accessibility: {
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        screenReaderMode: false,
      },
    };

    try {
      // In real implementation, query settings from game state
      return defaultData;
    } catch (error) {
      return {
        ...defaultData,
        available: false,
        unavailableReason: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  textFormatter(data: SettingsViewData): string {
    const lines: string[] = [
      'SETTINGS',
      '='.repeat(50),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason || 'Settings unavailable');
      return lines.join('\n');
    }

    // LLM Configuration
    lines.push('LLM PROVIDER');
    lines.push('-'.repeat(50));

    if (data.llmProvider) {
      const connectionStatus = data.llmProvider.isConnected ? 'Connected' : 'Disconnected';
      lines.push(`Provider: ${data.llmProvider.name}`);
      lines.push(`Type: ${data.llmProvider.type}`);
      lines.push(`Endpoint: ${data.llmProvider.endpoint}`);
      lines.push(`Model: ${data.llmProvider.model}`);
      lines.push(`Status: ${connectionStatus}`);

      if (data.llmProvider.lastError) {
        lines.push(`Last error: ${data.llmProvider.lastError}`);
      }
    } else {
      lines.push('No LLM provider configured.');
      lines.push('');
      lines.push('To enable AI agents:');
      lines.push('  1. Start Ollama: ollama serve');
      lines.push('  2. Pull a model: ollama pull qwen3:1.7b');
      lines.push('  3. Or configure an OpenAI-compatible endpoint');
    }

    if (data.availableModels.length > 0) {
      lines.push('');
      lines.push('Available models:');
      for (const model of data.availableModels) {
        lines.push(`  - ${model}`);
      }
    }
    lines.push('');

    // Agent Behavior
    lines.push('AGENT BEHAVIOR');
    lines.push('-'.repeat(50));
    lines.push(`Decision interval: ${data.behavior.agentDecisionInterval}ms`);
    lines.push(`Max concurrent LLM calls: ${data.behavior.maxConcurrentLLMCalls}`);
    lines.push(`Autonomous agents: ${data.behavior.enableAutonomousAgents ? 'Enabled' : 'Disabled'}`);
    lines.push(`DM prompt mode: ${data.behavior.dmPromptEnabled ? 'Enabled' : 'Disabled'}`);
    lines.push(`Debug mode: ${data.behavior.debugMode ? 'Enabled' : 'Disabled'}`);
    lines.push('');

    // Performance
    lines.push('PERFORMANCE');
    lines.push('-'.repeat(50));
    lines.push(`Target FPS: ${data.performance.targetFPS}`);
    lines.push(`Max entities: ${data.performance.maxEntities}`);
    lines.push(`Render distance: ${data.performance.renderDistance} tiles`);
    lines.push(`Particles: ${data.performance.enableParticles ? 'Enabled' : 'Disabled'}`);
    lines.push('');

    // Audio
    lines.push('AUDIO');
    lines.push('-'.repeat(50));
    lines.push(`Master volume: ${data.audio.masterVolume}%`);
    lines.push(`Music volume: ${data.audio.musicVolume}%`);
    lines.push(`Sound effects: ${data.audio.sfxVolume}%`);
    lines.push('');

    // Accessibility
    lines.push('ACCESSIBILITY');
    lines.push('-'.repeat(50));
    lines.push(`High contrast: ${data.accessibility.highContrast ? 'Enabled' : 'Disabled'}`);
    lines.push(`Large text: ${data.accessibility.largeText ? 'Enabled' : 'Disabled'}`);
    lines.push(`Reduced motion: ${data.accessibility.reducedMotion ? 'Enabled' : 'Disabled'}`);
    lines.push(`Screen reader mode: ${data.accessibility.screenReaderMode ? 'Enabled' : 'Disabled'}`);
    lines.push('');

    lines.push('Accessibility features help make the game playable for everyone.');
    lines.push('Screen reader mode provides detailed text descriptions of all game elements.');

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: SettingsViewData,
    bounds: RenderBounds,
    theme: RenderTheme
  ): void {
    const { x, y } = bounds;
    const { padding, lineHeight } = theme.spacing;

    ctx.font = theme.fonts.normal;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + padding;

    // LLM Status
    ctx.fillStyle = theme.colors.accent;
    ctx.font = theme.fonts.bold;
    ctx.fillText('LLM Provider', x + padding, currentY);
    currentY += lineHeight + 5;

    ctx.font = theme.fonts.normal;
    if (data.llmProvider) {
      const statusColor = data.llmProvider.isConnected ? '#00FF00' : '#FF6B6B';
      ctx.fillStyle = statusColor;
      ctx.fillText(data.llmProvider.isConnected ? 'Connected' : 'Disconnected', x + padding, currentY);
      currentY += lineHeight;

      ctx.fillStyle = theme.colors.text;
      ctx.fillText(`Model: ${data.llmProvider.model}`, x + padding, currentY);
      currentY += lineHeight;
    } else {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText('No provider configured', x + padding, currentY);
      currentY += lineHeight;
    }

    currentY += 10;

    // Behavior toggles
    ctx.fillStyle = theme.colors.accent;
    ctx.font = theme.fonts.bold;
    ctx.fillText('Agent Behavior', x + padding, currentY);
    currentY += lineHeight + 5;

    ctx.font = theme.fonts.normal;
    const autonomousColor = data.behavior.enableAutonomousAgents ? '#00FF00' : '#FF6B6B';
    ctx.fillStyle = autonomousColor;
    ctx.fillText(`Autonomous: ${data.behavior.enableAutonomousAgents ? 'ON' : 'OFF'}`, x + padding, currentY);
    currentY += lineHeight;

    const debugColor = data.behavior.debugMode ? '#FFD700' : theme.colors.textMuted;
    ctx.fillStyle = debugColor;
    ctx.fillText(`Debug: ${data.behavior.debugMode ? 'ON' : 'OFF'}`, x + padding, currentY);
    currentY += lineHeight + 10;

    // Performance
    ctx.fillStyle = theme.colors.accent;
    ctx.font = theme.fonts.bold;
    ctx.fillText('Performance', x + padding, currentY);
    currentY += lineHeight + 5;

    ctx.font = theme.fonts.normal;
    ctx.fillStyle = theme.colors.text;
    ctx.fillText(`FPS: ${data.performance.targetFPS}`, x + padding, currentY);
    ctx.fillText(`Entities: ${data.performance.maxEntities}`, x + padding + 80, currentY);
    currentY += lineHeight + 10;

    // Accessibility
    ctx.fillStyle = theme.colors.accent;
    ctx.font = theme.fonts.bold;
    ctx.fillText('Accessibility', x + padding, currentY);
    currentY += lineHeight + 5;

    ctx.font = theme.fonts.normal;
    const accessibilityItems = [
      { label: 'High Contrast', value: data.accessibility.highContrast },
      { label: 'Large Text', value: data.accessibility.largeText },
      { label: 'Screen Reader', value: data.accessibility.screenReaderMode },
    ];

    for (const item of accessibilityItems) {
      ctx.fillStyle = item.value ? '#90EE90' : theme.colors.textMuted;
      ctx.fillText(`${item.label}: ${item.value ? 'ON' : 'OFF'}`, x + padding, currentY);
      currentY += lineHeight;
    }
  },
};
