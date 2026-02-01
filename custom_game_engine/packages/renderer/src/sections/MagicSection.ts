/**
 * MagicSection - Magic paradigm state manipulation and mana/resource management
 */

import { SIZES } from '../DevPanelConstants.js';
import { PARADIGMS } from '../DevPanelData.js';
import type { ClickRegion, DevParadigmData } from '../DevPanelTypes.js';
import {
  renderSectionHeader,
  renderParadigmRow,
  renderSlider,
  renderActions,
} from './SectionUIComponents.js';

export interface MagicSectionState {
  paradigmStates: Map<string, { enabled: boolean; active: boolean; mana: number }>;
}

/**
 * Render the Magic section of the DevPanel
 */
export function renderMagicSection(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  state: MagicSectionState,
  clickRegions: ClickRegion[]
): number {
  // Paradigm toggles
  y = renderSectionHeader(ctx, width, y, 'PARADIGM STATES');

  for (const paradigm of PARADIGMS) {
    const paradigmState = state.paradigmStates.get(paradigm.id) ?? {
      enabled: paradigm.enabled,
      active: paradigm.active,
      mana: paradigm.mana,
    };
    y = renderParadigmRow(ctx, width, y, paradigm, paradigmState, clickRegions);
  }

  // Mana sliders
  y = renderSectionHeader(ctx, width, y, 'MANA / RESOURCES');

  for (const paradigm of PARADIGMS) {
    const paradigmState = state.paradigmStates.get(paradigm.id);
    if (!paradigmState?.enabled) continue;

    y = renderSlider(
      ctx,
      width,
      y,
      {
        id: `mana_${paradigm.id}`,
        name: `${paradigm.name} (${paradigm.manaType})`,
        value: paradigmState.mana,
        min: 0,
        max: paradigm.maxMana,
        section: 'magic',
        paradigm: paradigm.id,
      },
      clickRegions
    );
  }

  // Actions
  y = renderSectionHeader(ctx, width, y, 'QUICK ACTIONS');
  y = renderActions(ctx, width, y, 'magic', clickRegions);

  return y + SIZES.padding;
}
