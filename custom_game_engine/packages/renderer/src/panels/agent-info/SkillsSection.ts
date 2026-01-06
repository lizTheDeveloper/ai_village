/**
 * SkillsSection - Renders the Skills tab content.
 * Shows agent skills with levels/XP and personality traits.
 */

import type {
  SectionRenderContext,
  IdentityComponent,
  SkillsComponentData,
  PersonalityComponentData,
} from './types.js';
import { renderSeparator } from './renderUtils.js';

/** Skill display info. */
const SKILL_INFO: Record<string, { name: string; icon: string }> = {
  building: { name: 'Building', icon: '🏗️' },
  farming: { name: 'Farming', icon: '🌾' },
  gathering: { name: 'Gathering', icon: '🪓' },
  cooking: { name: 'Cooking', icon: '🍳' },
  crafting: { name: 'Crafting', icon: '🔨' },
  social: { name: 'Social', icon: '💬' },
  exploration: { name: 'Exploration', icon: '🧭' },
  combat: { name: 'Combat', icon: '⚔️' },
  animal_handling: { name: 'Animals', icon: '🐾' },
  medicine: { name: 'Medicine', icon: '💊' },
};

/** Skill level names. */
const SKILL_LEVEL_NAMES: Record<0 | 1 | 2 | 3 | 4 | 5, string> = {
  0: 'Untrained',
  1: 'Novice',
  2: 'Apprentice',
  3: 'Journeyman',
  4: 'Expert',
  5: 'Master',
};

/** XP thresholds per level. */
const XP_PER_LEVEL: Record<0 | 1 | 2 | 3 | 4 | 5, number> = {
  0: 0,
  1: 100,
  2: 300,
  3: 700,
  4: 1500,
  5: 3000,
};

/** Personality trait labels. */
const BIG_FIVE_TRAITS: Array<{ key: keyof PersonalityComponentData; label: string; lowDesc: string; highDesc: string }> = [
  { key: 'openness', label: 'Openness', lowDesc: 'Cautious', highDesc: 'Curious' },
  { key: 'conscientiousness', label: 'Conscientious', lowDesc: 'Spontaneous', highDesc: 'Organized' },
  { key: 'extraversion', label: 'Extraversion', lowDesc: 'Reserved', highDesc: 'Outgoing' },
  { key: 'agreeableness', label: 'Agreeableness', lowDesc: 'Competitive', highDesc: 'Cooperative' },
  { key: 'neuroticism', label: 'Neuroticism', lowDesc: 'Resilient', highDesc: 'Sensitive' },
];

const GAME_TRAITS: Array<{ key: keyof PersonalityComponentData; label: string }> = [
  { key: 'workEthic', label: 'Work Ethic' },
  { key: 'creativity', label: 'Creativity' },
  { key: 'generosity', label: 'Generosity' },
  { key: 'leadership', label: 'Leadership' },
];

export class SkillsSection {
  private panelWidth = 360;
  private scrollOffset = 0;

  getScrollOffset(): number {
    return this.scrollOffset;
  }

  setScrollOffset(offset: number): void {
    this.scrollOffset = offset;
  }

  handleScroll(deltaY: number): void {
    if (deltaY > 0) {
      this.scrollOffset += 3;
    } else {
      this.scrollOffset = Math.max(0, this.scrollOffset - 3);
    }
  }

  render(
    context: SectionRenderContext,
    identity: IdentityComponent | undefined,
    skills: SkillsComponentData | undefined,
    personality: PersonalityComponentData | undefined
  ): void {
    const { ctx, x, y, width, height, padding, lineHeight } = context;

    // Save the context state for clipping
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    let currentY = y + padding - this.scrollOffset;

    // Header
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(identity?.name ?? 'Agent', x + padding, currentY + 12);
    currentY += 24;

    // Skills Section
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Skills', x + padding, currentY);
    currentY += lineHeight + 5;

    if (skills) {
      ctx.font = '11px monospace';

      // Get skills sorted by level (highest first), then by XP
      const skillEntries = Object.entries(skills.levels)
        .filter(([skillId]) => SKILL_INFO[skillId])
        .sort((a, b) => {
          const levelDiff = b[1] - a[1];
          if (levelDiff !== 0) return levelDiff;
          return (skills.totalExperience[b[0]] || 0) - (skills.totalExperience[a[0]] || 0);
        });

      for (const [skillId, level] of skillEntries) {
        const info = SKILL_INFO[skillId];
        if (!info) continue;

        const totalXP = skills.totalExperience[skillId] || 0;
        const affinity = skills.affinities[skillId] || 1.0;

        currentY = this.renderSkillBar(
          ctx,
          x,
          currentY,
          info.icon,
          info.name,
          level as 0 | 1 | 2 | 3 | 4 | 5,
          totalXP,
          affinity,
          padding
        );
      }
    } else {
      ctx.fillStyle = '#888';
      ctx.font = '11px monospace';
      ctx.fillText('No skills data', x + padding, currentY);
      currentY += lineHeight;
    }

    currentY += 5;

    // Personality Section
    renderSeparator(ctx, x, currentY, this.panelWidth, padding);
    currentY += 10;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Personality', x + padding, currentY);
    currentY += lineHeight + 5;

    if (personality) {
      ctx.font = '11px monospace';

      // Big Five traits with descriptors
      for (const trait of BIG_FIVE_TRAITS) {
        const value = personality[trait.key] as number;
        currentY = this.renderTraitBar(
          ctx,
          x,
          currentY,
          trait.label,
          value,
          trait.lowDesc,
          trait.highDesc,
          padding
        );
      }

      currentY += 8;

      // Game-specific traits
      ctx.fillStyle = '#AAAAAA';
      ctx.font = '10px monospace';
      ctx.fillText('Game Traits:', x + padding, currentY);
      currentY += 14;

      for (const trait of GAME_TRAITS) {
        const value = personality[trait.key] as number;
        currentY = this.renderSimpleTraitBar(
          ctx,
          x,
          currentY,
          trait.label,
          value,
          padding
        );
      }
    } else {
      ctx.fillStyle = '#888';
      ctx.font = '11px monospace';
      ctx.fillText('No personality data', x + padding, currentY);
      currentY += lineHeight;
    }

    // Restore canvas state
    ctx.restore();
  }

  private renderSkillBar(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    y: number,
    icon: string,
    name: string,
    level: 0 | 1 | 2 | 3 | 4 | 5,
    totalXP: number,
    affinity: number,
    padding: number
  ): number {
    const levelName = SKILL_LEVEL_NAMES[level];
    const levelColor = this.getLevelColor(level);

    // Line 1: Icon, skill name, level name, and affinity
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '11px monospace';
    ctx.fillText(`${icon} ${name}`, panelX + padding, y);

    // Level name (after skill name)
    ctx.fillStyle = levelColor;
    ctx.font = 'bold 10px monospace';
    const levelX = panelX + padding + 95;
    ctx.fillText(levelName, levelX, y);

    // Affinity indicator (if not default) - at end of line 1
    if (affinity !== 1.0) {
      const affinityText = affinity > 1.0 ? `+${((affinity - 1) * 100).toFixed(0)}%` : `${((affinity - 1) * 100).toFixed(0)}%`;
      ctx.fillStyle = affinity > 1.0 ? '#88FF88' : '#FF8888';
      ctx.font = '9px monospace';
      ctx.fillText(affinityText, panelX + padding + 175, y);
    }

    // Line 2: Progress bar with XP text
    const barY = y + 6;
    const barHeight = 12;
    const barX = panelX + padding + 20;
    const barWidth = this.panelWidth - padding * 2 - 90;

    // Progress bar background
    ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Calculate progress to next level
    const progress = this.getProgressToNextLevel(totalXP, level);
    const fillWidth = barWidth * progress;

    // Progress bar fill
    ctx.fillStyle = levelColor;
    ctx.fillRect(barX, barY, fillWidth, barHeight);

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // XP text on the bar (centered)
    const xpText = this.getXPText(totalXP, level);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(xpText, barX + barWidth / 2, barY + barHeight - 2);
    ctx.textAlign = 'left';

    // Total XP after bar
    ctx.fillStyle = '#888888';
    ctx.font = '9px monospace';
    ctx.fillText(`${totalXP} XP`, barX + barWidth + 5, barY + barHeight - 2);

    return y + 26; // More vertical space for two-line layout
  }

  private getXPText(totalXP: number, level: 0 | 1 | 2 | 3 | 4 | 5): string {
    if (level >= 5) return 'MAX';

    const currentLevelXP = XP_PER_LEVEL[level];
    const nextLevel = (level + 1) as 1 | 2 | 3 | 4 | 5;
    const nextLevelXP = XP_PER_LEVEL[nextLevel];
    const xpInLevel = totalXP - currentLevelXP;
    const xpNeeded = nextLevelXP - currentLevelXP;

    return `${xpInLevel}/${xpNeeded}`;
  }

  private renderTraitBar(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    y: number,
    label: string,
    value: number,
    lowDesc: string,
    highDesc: string,
    padding: number
  ): number {
    const barWidth = this.panelWidth - padding * 2 - 80;
    const barHeight = 8;
    const barX = panelX + padding + 75;
    const barY = y - 6;

    // Trait label
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '10px monospace';
    ctx.fillText(label, panelX + padding, y);

    // Bar background (gradient from low to high)
    const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    gradient.addColorStop(0, 'rgba(100, 100, 200, 0.3)');
    gradient.addColorStop(0.5, 'rgba(100, 100, 100, 0.3)');
    gradient.addColorStop(1, 'rgba(200, 100, 100, 0.3)');
    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(barX + barWidth / 2, barY);
    ctx.lineTo(barX + barWidth / 2, barY + barHeight);
    ctx.stroke();

    // Value marker (value is 0-1, convert to bar position)
    const markerX = barX + barWidth * value;
    ctx.fillStyle = this.getTraitColor(value);
    ctx.beginPath();
    ctx.arc(markerX, barY + barHeight / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Low/High descriptors
    ctx.fillStyle = '#666666';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(lowDesc, barX, y + 8);
    ctx.textAlign = 'right';
    ctx.fillText(highDesc, barX + barWidth, y + 8);
    ctx.textAlign = 'left';

    return y + 20;
  }

  private renderSimpleTraitBar(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    y: number,
    label: string,
    value: number,
    padding: number
  ): number {
    const barWidth = this.panelWidth - padding * 2 - 80;
    const barHeight = 6;
    const barX = panelX + padding + 75;
    const barY = y - 4;

    // Trait label
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '10px monospace';
    ctx.fillText(label, panelX + padding, y);

    // Bar background
    ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Fill (value is 0-1, convert to bar width)
    const fillWidth = barWidth * value;
    ctx.fillStyle = this.getTraitColor(value);
    ctx.fillRect(barX, barY, fillWidth, barHeight);

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Value text (convert 0-1 to percentage for display)
    ctx.fillStyle = '#888888';
    ctx.font = '9px monospace';
    ctx.fillText(`${Math.round(value * 100)}`, barX + barWidth + 5, y);

    return y + 14;
  }

  private getLevelColor(level: number): string {
    switch (level) {
      case 0: return '#666666';
      case 1: return '#88AA88';
      case 2: return '#88CCCC';
      case 3: return '#AAAAFF';
      case 4: return '#FFAA88';
      case 5: return '#FFD700';
      default: return '#666666';
    }
  }

  private getTraitColor(value: number): string {
    // Value is 0-1 scale
    if (value >= 0.7) return '#88CC88';
    if (value >= 0.5) return '#CCCC88';
    if (value >= 0.3) return '#CC8888';
    return '#888888';
  }

  private getProgressToNextLevel(totalXP: number, level: 0 | 1 | 2 | 3 | 4 | 5): number {
    if (level >= 5) return 1.0;

    const currentLevelXP = XP_PER_LEVEL[level];
    const nextLevel = (level + 1) as 1 | 2 | 3 | 4 | 5;
    const nextLevelXP = XP_PER_LEVEL[nextLevel];
    const xpInLevel = totalXP - currentLevelXP;
    const xpNeeded = nextLevelXP - currentLevelXP;

    return Math.min(1.0, Math.max(0, xpInLevel / xpNeeded));
  }
}
