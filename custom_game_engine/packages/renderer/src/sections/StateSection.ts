/**
 * StateSection - State summary and reset
 */

import { SIZES } from '../DevPanelConstants.js';
import type { ClickRegion } from '../DevPanelTypes.js';
import { renderSectionHeader, renderStateSummary, renderActions } from './SectionUIComponents.js';

export interface StateSectionState {
  paradigmStates: Map<string, { enabled: boolean; active: boolean; mana: number }>;
  divineResources: Map<string, number>;
  skillXp: Map<string, number>;
  actionLog: string[];
}

/**
 * Render the State section of the DevPanel
 */
export function renderStateSection(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  state: StateSectionState,
  clickRegions: ClickRegion[]
): number {
  y = renderSectionHeader(ctx, width, y, 'STATE SUMMARY');
  y = renderStateSummary(
    ctx,
    width,
    y,
    state.paradigmStates,
    state.divineResources,
    state.skillXp,
    state.actionLog
  );

  y = renderSectionHeader(ctx, width, y, 'DANGER ZONE');
  y = renderActions(ctx, width, y, 'state', clickRegions);

  return y + SIZES.padding;
}
