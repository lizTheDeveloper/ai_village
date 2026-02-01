/**
 * SkillsSection - Agent skill XP management
 */

import type { WorldMutator, IdentityComponent, SkillsComponent } from '@ai-village/core';
import { CT } from '@ai-village/core';
import { COLORS, SIZES } from '../DevPanelConstants.js';
import type { ClickRegion } from '../DevPanelTypes.js';
import { renderSectionHeader, renderActions } from './SectionUIComponents.js';

export interface SkillsSectionState {
  selectedAgentId: string | null;
}

/**
 * Render the Skills section of the DevPanel
 */
export function renderSkillsSection(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  world: WorldMutator | null,
  state: SkillsSectionState,
  clickRegions: ClickRegion[]
): number {
  if (!world) {
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '10px monospace';
    ctx.fillText('No world available', SIZES.padding, y + 8);
    return y + 30;
  }

  // Show selected agent
  y = renderSectionHeader(ctx, width, y, 'SELECTED AGENT');

  if (!state.selectedAgentId) {
    ctx.fillStyle = COLORS.warning;
    ctx.font = '10px monospace';
    ctx.fillText('No agent selected', SIZES.padding, y + 8);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '9px monospace';
    ctx.fillText('Click an agent in the game to select', SIZES.padding, y + 24);
    y += 40;
  } else {
    const agent = world.getEntity(state.selectedAgentId);
    if (!agent) {
      ctx.fillStyle = COLORS.warning;
      ctx.font = '10px monospace';
      ctx.fillText('Selected agent not found', SIZES.padding, y + 8);
      y += 24;
    } else {
      const identity = agent.getComponent<IdentityComponent>(CT.Identity);
      const skills = agent.getComponent<SkillsComponent>(CT.Skills);

      ctx.fillStyle = COLORS.success;
      ctx.font = 'bold 11px monospace';
      ctx.fillText(identity?.name || 'Unnamed Agent', SIZES.padding, y + 8);

      if (skills) {
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '9px monospace';
        const skillEntries = Object.entries(skills.levels);
        const totalLevel = skillEntries.reduce((sum, [, level]) => sum + (level as number), 0);
        ctx.fillText(`Total Level: ${Math.floor(totalLevel)}`, SIZES.padding, y + 24);
        y += 36;

        // Show current skills
        y = renderSectionHeader(ctx, width, y, 'CURRENT SKILLS');

        for (const [skillName, level] of skillEntries.slice(0, 8)) {
          ctx.fillStyle = COLORS.text;
          ctx.font = '9px monospace';
          ctx.fillText(skillName, SIZES.padding, y + 4);

          ctx.fillStyle = COLORS.magic;
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`Lvl ${Math.floor(level as number)}`, width - 60, y + 4);

          y += 16;
        }

        if (skillEntries.length > 8) {
          ctx.fillStyle = COLORS.textDim;
          ctx.font = '9px monospace';
          ctx.fillText(`... and ${skillEntries.length - 8} more`, SIZES.padding, y + 4);
          y += 16;
        }
      } else {
        ctx.fillStyle = COLORS.textDim;
        ctx.font = '9px monospace';
        ctx.fillText('Agent has no skills', SIZES.padding, y + 24);
        y += 36;
      }
    }
  }

  // Grant XP buttons
  y = renderSectionHeader(ctx, width, y, 'GRANT XP TO SELECTED AGENT');

  const xpButtons = [
    { label: '+100 XP (Random Skill)', amount: 100 },
    { label: '+500 XP (Random Skill)', amount: 500 },
    { label: '+1000 XP (Random Skill)', amount: 1000 },
  ];

  for (const btn of xpButtons) {
    const btnWidth = width - SIZES.padding * 2;
    const isDisabled = !state.selectedAgentId;

    ctx.fillStyle = isDisabled ? COLORS.inputBg : COLORS.button;
    ctx.beginPath();
    ctx.roundRect(SIZES.padding, y + 4, btnWidth, SIZES.buttonHeight, 4);
    ctx.fill();

    ctx.fillStyle = isDisabled ? COLORS.textDim : COLORS.text;
    ctx.font = 'bold 9px monospace';
    ctx.fillText(btn.label, SIZES.padding + 8, y + 12);

    if (!isDisabled) {
      clickRegions.push({
        x: SIZES.padding,
        y: y + 4,
        width: btnWidth,
        height: SIZES.buttonHeight,
        action: 'execute_action',
        data: `grant_selected_agent_xp_${btn.amount}`,
      });
    }

    y += SIZES.buttonHeight + 4;
  }

  // Actions
  y = renderSectionHeader(ctx, width, y, 'QUICK ACTIONS (ALL AGENTS)');
  y = renderActions(ctx, width, y, 'skills', clickRegions);

  return y + SIZES.padding;
}
