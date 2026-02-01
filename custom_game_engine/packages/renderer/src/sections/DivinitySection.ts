/**
 * DivinitySection - Divine resources, belief, and deity management
 */

import type { WorldMutator } from '@ai-village/core';
import { CT, DeityComponent } from '@ai-village/core';
import { COLORS, SIZES } from '../DevPanelConstants.js';
import { DIVINE_RESOURCES } from '../DevPanelData.js';
import type { ClickRegion } from '../DevPanelTypes.js';
import { renderSectionHeader, renderSlider, renderActions } from './SectionUIComponents.js';

export interface DiviniySectionState {
  divineResources: Map<string, number>;
}

/**
 * Render the Divinity section of the DevPanel
 */
export function renderDivinitySection(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  world: WorldMutator | null,
  state: DiviniySectionState,
  clickRegions: ClickRegion[]
): number {
  if (!world) {
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '10px monospace';
    ctx.fillText('No world available', SIZES.padding, y + 8);
    return y + 30;
  }

  // Query for deity entities
  const deities = world.query().with(CT.Deity).executeEntities();

  if (deities.length === 0) {
    y = renderSectionHeader(ctx, width, y, 'DIVINITY');
    ctx.fillStyle = COLORS.warning;
    ctx.font = '10px monospace';
    ctx.fillText('No deities exist yet', SIZES.padding, y + 8);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '9px monospace';
    ctx.fillText('Deities emerge from agent belief', SIZES.padding, y + 24);
    y += 44;
  } else {
    // Display each deity
    for (const deity of deities) {
      const deityComp = deity.getComponent(CT.Deity) as DeityComponent;
      if (!deityComp) continue;

      y = renderSectionHeader(ctx, width, y, deityComp.identity.primaryName.toUpperCase());

      // Belief stats
      const beliefState = deityComp.belief;

      // Current belief
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '9px monospace';
      ctx.fillText('Current Belief:', SIZES.padding, y + 4);
      ctx.fillStyle = COLORS.divinity;
      ctx.font = 'bold 11px monospace';
      ctx.fillText(Math.floor(beliefState.currentBelief).toString(), SIZES.padding + 110, y + 4);
      y += 18;

      // Belief per tick
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '9px monospace';
      ctx.fillText('Belief/Tick:', SIZES.padding, y + 4);
      ctx.fillStyle = COLORS.success;
      ctx.font = '10px monospace';
      ctx.fillText(beliefState.beliefPerTick.toFixed(3), SIZES.padding + 110, y + 4);
      y += 18;

      // Believers
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '9px monospace';
      ctx.fillText('Believers:', SIZES.padding, y + 4);
      ctx.fillStyle = COLORS.text;
      ctx.font = '10px monospace';
      ctx.fillText(deityComp.believers.size.toString(), SIZES.padding + 110, y + 4);
      y += 18;

      // Total earned
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '9px monospace';
      ctx.fillText('Total Earned:', SIZES.padding, y + 4);
      ctx.fillStyle = COLORS.text;
      ctx.font = '10px monospace';
      ctx.fillText(Math.floor(beliefState.totalBeliefEarned).toString(), SIZES.padding + 110, y + 4);
      y += 18;

      // Total spent
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '9px monospace';
      ctx.fillText('Total Spent:', SIZES.padding, y + 4);
      ctx.fillStyle = COLORS.text;
      ctx.font = '10px monospace';
      ctx.fillText(Math.floor(beliefState.totalBeliefSpent).toString(), SIZES.padding + 110, y + 4);
      y += 18;

      // Unanswered prayers
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '9px monospace';
      ctx.fillText('Unanswered Prayers:', SIZES.padding, y + 4);
      ctx.fillStyle = deityComp.prayerQueue.length > 0 ? COLORS.warning : COLORS.textDim;
      ctx.font = '10px monospace';
      ctx.fillText(deityComp.prayerQueue.length.toString(), SIZES.padding + 140, y + 4);
      y += 22;

      // Controller type
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '9px monospace';
      ctx.fillText('Controller:', SIZES.padding, y + 4);
      const controllerColor = deityComp.controller === 'player' ? COLORS.success :
                             deityComp.controller === 'ai' ? COLORS.magic : COLORS.textDim;
      ctx.fillStyle = controllerColor;
      ctx.font = '10px monospace';
      ctx.fillText(deityComp.controller, SIZES.padding + 110, y + 4);
      y += 24;
    }
  }

  // Divine resources (sliders for belief, divine energy, etc.)
  if (deities.length > 0) {
    y = renderSectionHeader(ctx, width, y, 'DIVINE RESOURCES');

    // Render sliders for editable divine resources
    const editableResources = DIVINE_RESOURCES.filter(r =>
      r.category === 'belief' || r.category === 'energy'
    );

    for (const resource of editableResources) {
      const currentValue = state.divineResources.get(resource.id) ?? resource.value;
      y = renderSlider(
        ctx,
        width,
        y,
        {
          id: resource.id,
          name: resource.name,
          value: currentValue,
          min: resource.min,
          max: resource.max,
          section: 'divinity',
        },
        clickRegions
      );
    }
  }

  // Actions
  y = renderSectionHeader(ctx, width, y, 'QUICK ACTIONS');
  y = renderActions(ctx, width, y, 'divinity', clickRegions);

  return y + SIZES.padding;
}
