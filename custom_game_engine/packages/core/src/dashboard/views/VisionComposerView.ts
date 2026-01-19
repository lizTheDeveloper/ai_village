/**
 * VisionComposerView - Divine vision composition interface
 *
 * Allows deities to compose and send visions to mortals.
 * Shows vision types, target selection, and composition options.
 * Accessibility-first: describes vision composition in narrative form.
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
} from '../types.js';
import type { DeityComponent } from '../../components/DeityComponent.js';
import type { IdentityComponent } from '../../components/IdentityComponent.js';
import type { SpiritualComponent } from '../../components/SpiritualComponent.js';

/**
 * Vision type info
 */
interface VisionType {
  id: string;
  name: string;
  description: string;
  beliefCost: number;
  availableSymbols: string[];
}

/**
 * Potential vision target
 */
interface VisionTarget {
  id: string;
  name: string;
  type: 'believer' | 'priest' | 'mortal' | 'group';
  receptivity: number;
}

/**
 * Sent vision record
 */
interface SentVision {
  targetName: string;
  type: string;
  symbols: string[];
  intensity: number;
  timestamp: number;
  wasReceived: boolean;
  interpretation: string | null;
}

/**
 * Data returned by the VisionComposer view
 */
export interface VisionComposerViewData extends ViewData {
  /** Current belief available */
  currentBelief: number;
  /** Available vision types */
  visionTypes: VisionType[];
  /** Potential targets */
  targets: VisionTarget[];
  /** Recently sent visions */
  recentVisions: SentVision[];
  /** Divine symbols available */
  availableSymbols: string[];
  /** Vision intensity levels */
  intensityLevels: { id: string; name: string; multiplier: number }[];
}

/**
 * Format time since vision was sent
 */
function formatTimeSince(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  return 'just now';
}

/**
 * VisionComposer View Definition
 */
export const VisionComposerView: DashboardView<VisionComposerViewData> = {
  id: 'vision-composer',
  title: 'Vision Composer',
  category: 'divinity',
  keyboardShortcut: undefined,
  description: 'Compose and send divine visions to mortals',

  defaultSize: {
    width: 420,
    height: 550,
    minWidth: 380,
    minHeight: 450,
  },

  getData(context: ViewContext): VisionComposerViewData {
    const { world } = context;

    const defaultIntensityLevels = [
      { id: 'whisper', name: 'Whisper', multiplier: 0.5 },
      { id: 'clear', name: 'Clear', multiplier: 1.0 },
      { id: 'vivid', name: 'Vivid', multiplier: 1.5 },
      { id: 'overwhelming', name: 'Overwhelming', multiplier: 2.0 },
    ];

    const emptyData: VisionComposerViewData = {
      timestamp: Date.now(),
      available: true,
      currentBelief: 0,
      visionTypes: [],
      targets: [],
      recentVisions: [],
      availableSymbols: [],
      intensityLevels: defaultIntensityLevels,
    };

    if (!world) {
      emptyData.available = false;
      emptyData.unavailableReason = 'No world available';
      return emptyData;
    }

    try {
      const CT = { Deity: 'deity', Identity: 'identity', Spiritual: 'spiritual' } as const;

      // Find player deity
      let playerDeity: { id: string; component: DeityComponent } | null = null;
      for (const entity of world.entities.values()) {
        if (entity.components.has(CT.Deity)) {
          const deityComp = entity.components.get(CT.Deity) as DeityComponent | undefined;
          if (deityComp && deityComp.controller === 'player') {
            playerDeity = { id: entity.id, component: deityComp };
            break;
          }
        }
      }

      if (!playerDeity) {
        emptyData.available = false;
        emptyData.unavailableReason = 'No player deity found';
        return emptyData;
      }

      const deityComp = playerDeity.component;
      const currentBelief = deityComp.belief?.currentBelief ?? 0;

      // Determine available vision types based on belief tier
      const visionTypes: VisionType[] = [];

      if (currentBelief >= 5) {
        visionTypes.push({
          id: 'whisper',
          name: 'Divine Whisper',
          description: 'A subtle feeling, barely perceptible',
          beliefCost: 5,
          availableSymbols: ['warmth', 'peace', 'unease'],
        });
      }

      if (currentBelief >= 10) {
        visionTypes.push({
          id: 'dream',
          name: 'Dream Vision',
          description: 'Symbols and imagery in sleep',
          beliefCost: 10,
          availableSymbols: ['light', 'shadow', 'water', 'fire', 'growth'],
        });
      }

      if (currentBelief >= 50) {
        visionTypes.push({
          id: 'waking_vision',
          name: 'Waking Vision',
          description: 'Clear images while conscious',
          beliefCost: 50,
          availableSymbols: ['divine_presence', 'prophecy', 'warning', 'blessing'],
        });
      }

      if (currentBelief >= 400) {
        visionTypes.push({
          id: 'mass_vision',
          name: 'Mass Vision',
          description: 'Vision sent to multiple believers',
          beliefCost: 400,
          availableSymbols: ['unity', 'destiny', 'revelation', 'judgment'],
        });
      }

      // Find potential targets
      const targets: VisionTarget[] = [];

      for (const entity of world.entities.values()) {
        if (!entity.components.has(CT.Identity)) continue;

        const identityComp = entity.components.get(CT.Identity) as IdentityComponent | undefined;
        const spiritualComp = entity.components.get(CT.Spiritual) as SpiritualComponent | undefined;

        if (!identityComp || !spiritualComp) continue;

        const agentName = identityComp.name ?? 'Unknown';
        const faith = spiritualComp.faith ?? 0;
        const believedDeity = spiritualComp.believedDeity;

        // Believers are most receptive
        if (believedDeity === playerDeity.id) {
          const isPriest = spiritualComp.religiousLeader ?? false;
          targets.push({
            id: entity.id,
            name: agentName,
            type: isPriest ? 'priest' : 'believer',
            receptivity: Math.round(faith * 100),
          });
        } else if (faith > 0) {
          // Non-believers with some spirituality
          targets.push({
            id: entity.id,
            name: agentName,
            type: 'mortal',
            receptivity: Math.round(faith * 30), // Lower receptivity
          });
        }
      }

      // Sort targets by receptivity
      targets.sort((a, b) => b.receptivity - a.receptivity);

      // Get divine symbols based on deity domains
      const availableSymbols: string[] = [];
      const domain = deityComp.identity?.domain;

      // Core symbols always available
      availableSymbols.push('light', 'darkness', 'peace', 'power');

      // Domain-specific symbols
      if (domain === 'harvest') {
        availableSymbols.push('grain', 'abundance', 'fertility', 'growth');
      } else if (domain === 'war') {
        availableSymbols.push('sword', 'shield', 'victory', 'courage');
      } else if (domain === 'wisdom') {
        availableSymbols.push('book', 'owl', 'truth', 'knowledge');
      } else if (domain === 'nature') {
        availableSymbols.push('tree', 'animal', 'seasons', 'wilderness');
      } else if (domain === 'death') {
        availableSymbols.push('skull', 'passage', 'ending', 'peace');
      } else if (domain === 'healing') {
        availableSymbols.push('water', 'restoration', 'wholeness', 'mercy');
      }

      // Get recent visions from deity component
      const recentVisions: SentVision[] = deityComp.sentVisions?.map((sv) => ({
        targetName: sv.targetName,
        type: sv.powerType,
        symbols: [], // TODO: Track symbols used
        intensity: sv.powerType === 'whisper' ? 0.3 : sv.powerType === 'dream_hint' ? 0.5 : 0.9,
        timestamp: sv.timestamp,
        wasReceived: sv.wasReceived,
        interpretation: sv.interpretation ?? null,
      })) ?? [];

      return {
        timestamp: Date.now(),
        available: true,
        currentBelief,
        visionTypes,
        targets,
        recentVisions,
        availableSymbols,
        intensityLevels: defaultIntensityLevels,
      };
    } catch (error) {
      return {
        ...emptyData,
        available: false,
        unavailableReason: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  textFormatter(data: VisionComposerViewData): string {
    const lines: string[] = [
      'VISION COMPOSER',
      '='.repeat(50),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason || 'Vision composer unavailable');
      return lines.join('\n');
    }

    // Introduction
    lines.push('As a divine being, you can send visions to mortals.');
    lines.push('Visions cost belief and may be interpreted differently by each mortal.');
    lines.push('');

    // Belief available
    lines.push('DIVINE POWER');
    lines.push('-'.repeat(50));
    lines.push(`Available belief: ${Math.floor(data.currentBelief)} points`);
    lines.push('');

    // Vision types
    lines.push('VISION TYPES');
    lines.push('-'.repeat(50));

    if (data.visionTypes.length === 0) {
      lines.push('No vision types unlocked yet.');
      lines.push('Gain more believers to unlock divine communication abilities.');
    } else {
      for (const type of data.visionTypes) {
        const affordable = data.currentBelief >= type.beliefCost ? '' : ' (insufficient belief)';
        lines.push(`  ${type.name.toUpperCase()}${affordable}`);
        lines.push(`    ${type.description}`);
        lines.push(`    Cost: ${type.beliefCost} belief`);
        if (type.availableSymbols.length > 0) {
          lines.push(`    Symbols: ${type.availableSymbols.join(', ')}`);
        }
        lines.push('');
      }
    }

    // Potential targets
    lines.push('POTENTIAL RECIPIENTS');
    lines.push('-'.repeat(50));

    if (data.targets.length === 0) {
      lines.push('No mortals are receptive to your visions.');
      lines.push('Gain believers or perform miracles to attract followers.');
    } else {
      // Group by type
      const priests = data.targets.filter(t => t.type === 'priest');
      const believers = data.targets.filter(t => t.type === 'believer');
      const others = data.targets.filter(t => t.type !== 'priest' && t.type !== 'believer');

      if (priests.length > 0) {
        lines.push('  Priests (high receptivity):');
        for (const target of priests) {
          lines.push(`    - ${target.name} (receptivity: ${target.receptivity}%)`);
        }
      }

      if (believers.length > 0) {
        lines.push('  Believers:');
        for (const target of believers.slice(0, 5)) {
          lines.push(`    - ${target.name} (receptivity: ${target.receptivity}%)`);
        }
        if (believers.length > 5) {
          lines.push(`    ... and ${believers.length - 5} more believers`);
        }
      }

      if (others.length > 0) {
        lines.push('  Other mortals (low receptivity):');
        for (const target of others.slice(0, 3)) {
          lines.push(`    - ${target.name} (receptivity: ${target.receptivity}%)`);
        }
        if (others.length > 3) {
          lines.push(`    ... and ${others.length - 3} more`);
        }
      }
    }
    lines.push('');

    // Divine symbols
    if (data.availableSymbols.length > 0) {
      lines.push('DIVINE SYMBOLS');
      lines.push('-'.repeat(50));
      lines.push('Symbols that can appear in your visions:');
      lines.push(`  ${data.availableSymbols.join(', ')}`);
      lines.push('');
      lines.push('Different symbols convey different meanings and emotions.');
      lines.push('Combine symbols to create complex messages.');
      lines.push('');
    }

    // Intensity levels
    lines.push('VISION INTENSITY');
    lines.push('-'.repeat(50));
    lines.push('How powerfully the vision manifests to the mortal:');
    for (const level of data.intensityLevels) {
      const costNote = level.multiplier !== 1.0 ? ` (${level.multiplier}x cost)` : '';
      lines.push(`  ${level.name}${costNote}`);
    }
    lines.push('');
    lines.push('Higher intensity increases the chance of reception but costs more belief.');
    lines.push('');

    // Recent visions
    if (data.recentVisions.length > 0) {
      lines.push('RECENTLY SENT VISIONS');
      lines.push('-'.repeat(50));

      for (const vision of data.recentVisions.slice(0, 5)) {
        const receivedStatus = vision.wasReceived ? 'received' : 'not received';
        lines.push(`  ${vision.targetName} - ${vision.type} (${receivedStatus})`);
        lines.push(`    Sent: ${formatTimeSince(vision.timestamp)}`);
        lines.push(`    Symbols: ${vision.symbols.join(', ') || 'none'}`);
        if (vision.interpretation) {
          lines.push(`    Mortal's interpretation: "${vision.interpretation}"`);
        }
        lines.push('');
      }
    }

    // Instructions
    lines.push('HOW TO SEND A VISION');
    lines.push('-'.repeat(50));
    lines.push('1. Select a vision type');
    lines.push('2. Choose symbols to include');
    lines.push('3. Set the intensity level');
    lines.push('4. Select one or more recipients');
    lines.push('5. Send the vision');
    lines.push('');
    lines.push('Remember: mortals interpret visions based on their own beliefs and fears.');

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: VisionComposerViewData,
    bounds: RenderBounds,
    theme: RenderTheme
  ): void {
    const { x, y } = bounds;
    const { padding, lineHeight } = theme.spacing;

    ctx.font = theme.fonts.normal;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + padding;

    if (!data.available) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText(data.unavailableReason || 'Vision composer unavailable', x + padding, currentY);
      return;
    }

    // Header
    ctx.fillStyle = '#FFD700';
    ctx.font = theme.fonts.bold;
    ctx.fillText('Vision Composer', x + padding, currentY);
    currentY += lineHeight + 5;

    // Belief
    ctx.font = theme.fonts.normal;
    ctx.fillStyle = theme.colors.text;
    ctx.fillText(`Belief: ${Math.floor(data.currentBelief)}`, x + padding, currentY);
    currentY += lineHeight + 10;

    // Vision types
    ctx.fillStyle = theme.colors.accent;
    ctx.font = theme.fonts.bold;
    ctx.fillText('Vision Types', x + padding, currentY);
    currentY += lineHeight + 5;

    ctx.font = theme.fonts.normal;
    if (data.visionTypes.length === 0) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText('No vision types unlocked', x + padding, currentY);
      currentY += lineHeight;
    } else {
      for (const type of data.visionTypes.slice(0, 4)) {
        const affordable = data.currentBelief >= type.beliefCost;
        ctx.fillStyle = affordable ? '#DAA520' : theme.colors.textMuted;
        ctx.fillText(`${type.name} (${type.beliefCost} belief)`, x + padding, currentY);
        currentY += lineHeight;
      }
    }

    currentY += 10;

    // Targets summary
    ctx.fillStyle = theme.colors.accent;
    ctx.font = theme.fonts.bold;
    ctx.fillText('Recipients', x + padding, currentY);
    currentY += lineHeight + 5;

    ctx.font = theme.fonts.normal;
    const priestCount = data.targets.filter(t => t.type === 'priest').length;
    const believerCount = data.targets.filter(t => t.type === 'believer').length;

    if (data.targets.length === 0) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText('No receptive mortals', x + padding, currentY);
    } else {
      ctx.fillStyle = theme.colors.text;
      ctx.fillText(`${priestCount} priests, ${believerCount} believers`, x + padding, currentY);
      currentY += lineHeight;
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText(`${data.targets.length} total receptive`, x + padding, currentY);
    }
  },
};
