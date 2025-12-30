/**
 * SpellbookView - Magic spellbook interface
 *
 * Shows available spells, mana, schools of magic, and casting options.
 * Accessibility-first: describes magical capabilities in narrative form.
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
} from '../types.js';
import { createProgressBar } from '../theme.js';

/**
 * A spell entry
 */
interface SpellEntry {
  id: string;
  name: string;
  school: string;
  tier: number;
  manaCost: number;
  castTime: number;
  description: string;
  proficiency: number;
  isLearned: boolean;
  isReady: boolean;
  cooldownRemaining: number;
  hotkey: string | null;
}

/**
 * A magic school entry
 */
interface MagicSchool {
  id: string;
  name: string;
  proficiency: number;
  spellCount: number;
  description: string;
}

/**
 * Data returned by the Spellbook view
 */
export interface SpellbookViewData extends ViewData {
  /** Current mana */
  currentMana: number;
  /** Maximum mana */
  maxMana: number;
  /** Mana regeneration per second */
  manaRegen: number;
  /** Total spells learned */
  totalSpellsLearned: number;
  /** Total spells available */
  totalSpellsAvailable: number;
  /** Magic schools with proficiency */
  schools: MagicSchool[];
  /** All spells */
  spells: SpellEntry[];
  /** Active spell effects */
  activeEffects: string[];
  /** Selected entity ID for agent-specific spellbooks */
  selectedAgentId: string | null;
  /** Selected agent name */
  selectedAgentName: string | null;
}

/**
 * Get tier name
 */
function getTierName(tier: number): string {
  const tiers = ['Cantrip', 'Novice', 'Apprentice', 'Journeyman', 'Expert', 'Master', 'Legendary'];
  return tiers[tier] || `Tier ${tier}`;
}

/**
 * Spellbook View Definition
 */
export const SpellbookView: DashboardView<SpellbookViewData> = {
  id: 'spellbook',
  title: 'Spellbook',
  category: 'magic',
  keyboardShortcut: undefined, // Uses existing panel shortcut
  description: 'View and manage magical spells, mana, and arcane schools',

  defaultSize: {
    width: 420,
    height: 600,
    minWidth: 380,
    minHeight: 500,
  },

  getData(context: ViewContext): SpellbookViewData {
    const { world, selectedEntityId } = context;

    const emptyData: SpellbookViewData = {
      timestamp: Date.now(),
      available: true,
      currentMana: 0,
      maxMana: 100,
      manaRegen: 1,
      totalSpellsLearned: 0,
      totalSpellsAvailable: 0,
      schools: [],
      spells: [],
      activeEffects: [],
      selectedAgentId: selectedEntityId || null,
      selectedAgentName: null,
    };

    if (!world) {
      emptyData.available = false;
      emptyData.unavailableReason = 'No world available';
      return emptyData;
    }

    try {
      // In real implementation, query magic system state
      // For now, return placeholder structure
      return emptyData;
    } catch (error) {
      return {
        ...emptyData,
        available: false,
        unavailableReason: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  textFormatter(data: SpellbookViewData): string {
    const lines: string[] = [
      'SPELLBOOK',
      '='.repeat(50),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason || 'Spellbook unavailable');
      return lines.join('\n');
    }

    // Mana status - narrative
    lines.push('MANA POOL');
    lines.push('-'.repeat(50));

    const manaPercent = data.maxMana > 0 ? (data.currentMana / data.maxMana) * 100 : 0;
    const manaDesc = manaPercent >= 80 ? 'brimming with magical energy' :
      manaPercent >= 50 ? 'well-stocked with mana' :
        manaPercent >= 25 ? 'running low on magical reserves' :
          manaPercent > 0 ? 'nearly depleted of mana' : 'completely drained';

    lines.push(`Your mana pool is ${manaDesc}.`);
    lines.push(`Current: ${Math.floor(data.currentMana)} / ${data.maxMana} mana`);
    lines.push(`${createProgressBar(manaPercent, 30)}`);
    lines.push(`Regeneration: +${data.manaRegen.toFixed(1)} mana per second`);
    lines.push('');

    // Active effects
    if (data.activeEffects.length > 0) {
      lines.push('ACTIVE MAGICAL EFFECTS');
      lines.push('-'.repeat(50));
      for (const effect of data.activeEffects) {
        lines.push(`  * ${effect}`);
      }
      lines.push('');
    }

    // Schools of magic
    if (data.schools.length > 0) {
      lines.push('SCHOOLS OF MAGIC');
      lines.push('-'.repeat(50));
      lines.push('Your proficiency in the arcane arts:');
      lines.push('');

      for (const school of data.schools) {
        const profDesc = school.proficiency >= 80 ? 'Master' :
          school.proficiency >= 60 ? 'Expert' :
            school.proficiency >= 40 ? 'Journeyman' :
              school.proficiency >= 20 ? 'Apprentice' : 'Novice';

        lines.push(`  ${school.name.toUpperCase()}`);
        lines.push(`    ${school.description}`);
        lines.push(`    Proficiency: ${profDesc} (${school.proficiency}%)`);
        lines.push(`    ${createProgressBar(school.proficiency, 20)}`);
        lines.push(`    Spells known: ${school.spellCount}`);
        lines.push('');
      }
    } else {
      lines.push('SCHOOLS OF MAGIC');
      lines.push('-'.repeat(50));
      lines.push('You have not yet begun studying any school of magic.');
      lines.push('Seek out magical knowledge to begin your arcane journey.');
      lines.push('');
    }

    // Spells
    if (data.spells.length > 0) {
      lines.push('KNOWN SPELLS');
      lines.push('-'.repeat(50));

      // Group by school
      const spellsBySchool = new Map<string, SpellEntry[]>();
      for (const spell of data.spells) {
        if (!spellsBySchool.has(spell.school)) {
          spellsBySchool.set(spell.school, []);
        }
        spellsBySchool.get(spell.school)!.push(spell);
      }

      for (const [school, schoolSpells] of spellsBySchool) {
        lines.push(`  ${school.toUpperCase()}`);

        for (const spell of schoolSpells) {
          const tierName = getTierName(spell.tier);
          const readyStatus = spell.isReady ? '' :
            spell.cooldownRemaining > 0 ? ` (cooling down: ${spell.cooldownRemaining}s)` :
              ' (not enough mana)';
          const hotkeyNote = spell.hotkey ? ` [${spell.hotkey}]` : '';

          lines.push(`    ${spell.name}${hotkeyNote} - ${tierName}${readyStatus}`);
          lines.push(`      ${spell.description}`);
          lines.push(`      Cost: ${spell.manaCost} mana | Cast time: ${spell.castTime}s`);
          lines.push(`      Your proficiency: ${spell.proficiency}%`);
        }
        lines.push('');
      }

      // Summary
      lines.push(`Total: ${data.totalSpellsLearned} spells learned of ${data.totalSpellsAvailable} available`);
    } else {
      lines.push('SPELLS');
      lines.push('-'.repeat(50));
      lines.push('You have not learned any spells yet.');
      lines.push('');
      lines.push('To learn spells:');
      lines.push('  - Study at a magical academy');
      lines.push('  - Find spell scrolls or tomes');
      lines.push('  - Learn from a magical mentor');
      lines.push('  - Discover through experimentation');
    }

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: SpellbookViewData,
    bounds: RenderBounds,
    theme: RenderTheme
  ): void {
    const { x, y, width } = bounds;
    const { padding, lineHeight } = theme.spacing;

    ctx.font = theme.fonts.normal;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + padding;

    if (!data.available) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText(data.unavailableReason || 'Spellbook unavailable', x + padding, currentY);
      return;
    }

    // Mana bar
    ctx.fillStyle = theme.colors.text;
    ctx.fillText('Mana:', x + padding, currentY);

    const barX = x + padding + 50;
    const barWidth = width - padding * 2 - 80;
    const barHeight = 16;

    // Background
    ctx.fillStyle = '#1a1a4a';
    ctx.fillRect(barX, currentY, barWidth, barHeight);

    // Mana fill
    const manaPercent = data.maxMana > 0 ? data.currentMana / data.maxMana : 0;
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(barX, currentY, barWidth * manaPercent, barHeight);

    // Mana text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(data.currentMana)}/${data.maxMana}`, barX + barWidth / 2, currentY + 3);
    ctx.textAlign = 'left';

    currentY += barHeight + 15;

    // Schools summary
    ctx.font = theme.fonts.bold;
    ctx.fillStyle = '#9370DB';
    ctx.fillText('Magic Schools', x + padding, currentY);
    currentY += lineHeight + 5;

    ctx.font = theme.fonts.normal;
    if (data.schools.length === 0) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText('No schools studied yet', x + padding, currentY);
      currentY += lineHeight;
    } else {
      for (const school of data.schools.slice(0, 4)) {
        ctx.fillStyle = theme.colors.text;
        ctx.fillText(`${school.name}: ${school.proficiency}%`, x + padding, currentY);
        currentY += lineHeight;
      }
    }

    currentY += 10;

    // Ready spells
    ctx.font = theme.fonts.bold;
    ctx.fillStyle = '#4169E1';
    ctx.fillText('Ready Spells', x + padding, currentY);
    currentY += lineHeight + 5;

    ctx.font = theme.fonts.normal;
    const readySpells = data.spells.filter(s => s.isReady);
    if (readySpells.length === 0) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText('No spells ready to cast', x + padding, currentY);
    } else {
      for (const spell of readySpells.slice(0, 5)) {
        const hotkeyNote = spell.hotkey ? ` [${spell.hotkey}]` : '';
        ctx.fillStyle = data.currentMana >= spell.manaCost ? '#90EE90' : '#FFD700';
        ctx.fillText(`${spell.name}${hotkeyNote} (${spell.manaCost} mana)`, x + padding, currentY);
        currentY += lineHeight;
      }
    }
  },
};
