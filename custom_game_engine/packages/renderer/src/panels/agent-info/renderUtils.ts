/**
 * Shared rendering utilities for AgentInfoPanel sections.
 */

/**
 * Render text with word wrapping, limiting to a maximum number of lines.
 * @returns Updated Y position
 */
export function renderWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  panelX: number,
  y: number,
  padding: number,
  lineHeight: number,
  maxWidth: number,
  maxLines: number
): number {
  const words = text.split(' ');
  let line = '';
  let linesRendered = 0;

  for (const word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && line.length > 0) {
      if (linesRendered >= maxLines - 1) {
        let truncatedLine = line.trim();
        while (ctx.measureText(truncatedLine + '...').width > maxWidth && truncatedLine.length > 0) {
          truncatedLine = truncatedLine.slice(0, -1);
        }
        ctx.fillText(truncatedLine + '...', panelX + padding, y);
        y += lineHeight;
        return y;
      }

      ctx.fillText(line.trim(), panelX + padding, y);
      y += lineHeight;
      linesRendered++;
      line = word + ' ';
    } else {
      line = testLine;
    }
  }

  if (line.length > 0 && linesRendered < maxLines) {
    ctx.fillText(line.trim(), panelX + padding, y);
    y += lineHeight;
  }

  return y;
}

/**
 * Wrap text to fit within maxWidth, returning array of lines.
 */
export function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    // Simple character-based approximation (each char ~7px in 11px monospace)
    if (testLine.length * 7 > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Render a horizontal separator line.
 */
export function renderSeparator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  padding: number
): void {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.moveTo(x + padding, y);
  ctx.lineTo(x + width - padding, y);
  ctx.stroke();
}

/**
 * Get the resource icon emoji for a resource type.
 */
export function getResourceIcon(resourceType: string): string {
  if (resourceType.endsWith('_seeds') || resourceType.startsWith('seed:')) {
    return '🌱';
  }

  const icons: Record<string, string> = {
    wood: '🪵',
    stone: '🪨',
    food: '🍎',
    water: '💧',
    berry: '🫐',
    wheat: '🌾',
    carrot: '🥕',
    apple: '🍎',
  };

  return icons[resourceType] || '📦';
}

/**
 * Get an icon for an item type.
 */
export function getItemIcon(itemId: string): string {
  const icons: Record<string, string> = {
    wood: '🪵',
    stone: '🪨',
    food: '🍎',
    berry: '🫐',
    water: '💧',
    wheat: '🌾',
    apple: '🍎',
    carrot: '🥕',
  };
  if (itemId.endsWith('_seeds')) {
    return '🌱';
  }
  return icons[itemId] || '📦';
}

/**
 * Format item ID as a display label (e.g., 'berry_bush_seeds' -> 'Berry Bush Seeds').
 */
export function formatItemLabel(itemId: string): string {
  if (itemId.startsWith('seed:')) {
    const species = itemId.slice(5);
    return species.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Seeds';
  }
  return itemId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Format item name for display (convert snake_case to Title Case).
 */
export function formatItemName(itemId: string): string {
  return itemId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Count resources by type from inventory slots.
 */
export function countResourcesByType(
  slots: Array<{ itemId: string | null; quantity: number }>
): Record<string, number> {
  if (!Array.isArray(slots)) {
    throw new Error("InventoryComponent 'slots' must be an array");
  }

  const counts: Record<string, number> = {};

  for (const slot of slots) {
    if (slot.itemId && slot.quantity > 0) {
      counts[slot.itemId] = (counts[slot.itemId] || 0) + slot.quantity;
    }
  }

  return counts;
}

/**
 * Get color for temperature state.
 */
export function getTemperatureStateColor(state: string): string {
  switch (state) {
    case 'dangerously_cold':
      return '#0088FF';
    case 'cold':
      return '#00DDFF';
    case 'comfortable':
      return '#00FF00';
    case 'hot':
      return '#FFAA00';
    case 'dangerously_hot':
      return '#FF0000';
    default:
      return '#FFFFFF';
  }
}

/**
 * Get color for need bar based on value and type.
 * Energy uses blue (high) → yellow (medium) → red (low).
 * Other needs use traditional traffic light colors.
 */
export function getNeedBarColor(needType: string, value: number): string {
  if (needType === 'Energy') {
    if (value >= 50) return '#00AAFF';     // Blue (well rested)
    if (value >= 30) return '#00DDFF';     // Cyan (normal)
    if (value >= 15) return '#FFCC00';     // Yellow (getting tired)
    if (value >= 5) return '#FF8800';      // Orange (very tired)
    return '#FF0000';                      // Red (exhausted)
  }

  if (value < 20) return '#FF0000';
  if (value < 40) return '#FF8800';
  if (value < 70) return '#FFFF00';
  return '#00FF00';
}

/**
 * Render a locked section header with lock icon and "Scanner upgrade required" message.
 * Used when a scanner tier is insufficient to view the section.
 */
export function renderLockedSection(
  ctx: CanvasRenderingContext2D,
  label: string,
  panelX: number,
  y: number,
  padding: number,
  lineHeight: number
): number {
  // Greyed-out section header with lock icon
  ctx.fillStyle = '#555555';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`🔒 ${label}`, panelX + padding, y);
  y += lineHeight;

  // "Scanner upgrade required" hint
  ctx.fillStyle = '#444444';
  ctx.font = '11px monospace';
  ctx.fillText('Scanner upgrade required', panelX + padding + 20, y);
  y += lineHeight + 5;

  return y;
}

/**
 * Render a single compact summary line for multiple locked sections.
 * Collapses consecutive locked sections to save vertical space.
 * If one label: "🔒 {label} — Scanner upgrade required"
 * If multiple: "🔒 {count} sections locked — Upgrade scanner"
 */
export function renderLockedSectionsSummary(
  ctx: CanvasRenderingContext2D,
  labels: string[],
  panelX: number,
  y: number,
  padding: number,
  lineHeight: number
): number {
  ctx.fillStyle = '#555555';
  ctx.font = '11px monospace';
  const text = labels.length === 1
    ? `🔒 ${labels[0]} — Scanner upgrade required`
    : `🔒 ${labels.length} sections locked — Upgrade scanner`;
  ctx.fillText(text, panelX + padding, y);
  return y + lineHeight + 5;
}

/**
 * Render a compact single-line locked section indicator.
 * Saves ~1 lineHeight + 5px vs renderLockedSection.
 */
export function renderLockedSectionCompact(
  ctx: CanvasRenderingContext2D,
  label: string,
  panelX: number,
  y: number,
  padding: number,
  lineHeight: number
): number {
  ctx.fillStyle = '#555555';
  ctx.font = '11px monospace';
  ctx.fillText(`🔒 ${label} — Scanner upgrade required`, panelX + padding, y);
  y += lineHeight;
  return y;
}
