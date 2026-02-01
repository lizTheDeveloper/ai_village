/**
 * EventsSection - Event triggers and action log
 */

import { SIZES } from '../DevPanelConstants.js';
import type { ClickRegion } from '../DevPanelTypes.js';
import { renderSectionHeader, renderActions, renderActionLog } from './SectionUIComponents.js';

/**
 * Render the Events section of the DevPanel
 */
export function renderEventsSection(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  actionLog: string[],
  clickRegions: ClickRegion[]
): number {
  y = renderSectionHeader(ctx, width, y, 'TRIGGER EVENTS');
  y = renderActions(ctx, width, y, 'events', clickRegions);

  // Event log preview
  y = renderSectionHeader(ctx, width, y, 'RECENT ACTIONS');
  y = renderActionLog(ctx, width, y, actionLog);

  return y + SIZES.padding;
}
