/**
 * DevSection - Renders the Dev tab content.
 * Shows all components with devToolsPanel: true for debugging/admin actions.
 */

import type { SectionRenderContext, IdentityComponent } from './types.js';
import { ComponentRegistry } from '@ai-village/introspection';
import { renderSeparator } from './renderUtils.js';

export class DevSection {
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
    entity: any,
    identity: IdentityComponent | undefined
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
    ctx.font = 'bold 14px monospace';
    const headerText = identity?.name ? `${identity.name} - Dev Panel` : 'Dev Panel';
    ctx.fillText(headerText, x + padding, currentY);
    currentY += lineHeight + 4;

    ctx.fillStyle = '#888888';
    ctx.font = '11px monospace';
    ctx.fillText('Components with devToolsPanel enabled:', x + padding, currentY);
    currentY += lineHeight + 8;

    // Get all schemas with devToolsPanel: true
    const allSchemas = ComponentRegistry.getAll();
    const devToolSchemas = allSchemas.filter(schema => schema.ui?.devToolsPanel === true);

    if (!entity || !entity.components) {
      ctx.fillStyle = '#FF6666';
      ctx.font = '12px monospace';
      ctx.fillText('No entity selected', x + padding, currentY);
      ctx.restore();
      return;
    }

    // Filter to only schemas for components this entity actually has
    const entityComponents = new Set(Array.from(entity.components.keys()));
    const relevantSchemas = devToolSchemas.filter(schema =>
      entityComponents.has(schema.type)
    );

    if (relevantSchemas.length === 0) {
      ctx.fillStyle = '#888888';
      ctx.font = '12px monospace';
      ctx.fillText('No dev panel components on this entity', x + padding, currentY);
      ctx.restore();
      return;
    }

    // Sort schemas by priority (higher priority first)
    relevantSchemas.sort((a, b) => {
      const aPriority = a.ui?.priority ?? 0;
      const bPriority = b.ui?.priority ?? 0;
      return bPriority - aPriority;
    });

    // Render each component
    for (const schema of relevantSchemas) {
      const component = entity.components.get(schema.type);
      if (!component) continue;

      // Component header
      const icon = schema.ui?.icon ?? '📦';
      const color = schema.ui?.color ?? '#FFFFFF';

      ctx.fillStyle = color;
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`${icon} ${schema.type}`, x + padding, currentY);
      currentY += lineHeight + 2;

      // Render fields
      if (schema.fields) {
        ctx.font = '11px monospace';

        for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
          // Skip fields not visible to dev
          if (fieldDef.visibility && !fieldDef.visibility.dev) {
            continue;
          }

          const value = component[fieldName];
          const displayName = fieldDef.displayName || fieldName;

          // Format value for display
          let displayValue: string;
          if (value === undefined || value === null) {
            displayValue = 'undefined';
          } else if (typeof value === 'boolean') {
            displayValue = value ? 'true' : 'false';
          } else if (typeof value === 'number') {
            displayValue = value.toFixed(2);
          } else if (typeof value === 'string') {
            displayValue = value.length > 30 ? value.substring(0, 30) + '...' : value;
          } else if (Array.isArray(value)) {
            displayValue = `[${value.length} items]`;
          } else if (typeof value === 'object') {
            displayValue = '{...}';
          } else {
            displayValue = String(value);
          }

          // Field name
          ctx.fillStyle = '#AAAAAA';
          ctx.fillText(`  ${displayName}:`, x + padding, currentY);

          // Field value
          const valueColor = fieldDef.mutable ? '#77FF77' : '#CCCCCC';
          ctx.fillStyle = valueColor;
          const valueX = x + padding + 150;
          ctx.fillText(displayValue, valueX, currentY);

          currentY += lineHeight;
        }
      }

      // Add separator between components
      currentY += 4;
      renderSeparator(ctx, x + padding, currentY, width - padding * 2);
      currentY += 8;
    }

    ctx.restore();
  }
}
