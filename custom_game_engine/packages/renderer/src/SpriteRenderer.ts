/**
 * Simple sprite rendering (placeholders until we have real sprites).
 */

export function renderSprite(
  ctx: CanvasRenderingContext2D,
  spriteId: string,
  x: number,
  y: number,
  size: number
): void {
  switch (spriteId) {
    case 'tree':
      // Draw a simple tree
      ctx.fillStyle = '#2d5016'; // Dark green
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 3, 0, Math.PI * 2);
      ctx.fill();

      // Trunk
      ctx.fillStyle = '#4a3520';
      ctx.fillRect(x + size / 2 - size / 8, y + size / 2, size / 4, size / 3);
      break;

    case 'rock':
      // Draw a simple rock
      ctx.fillStyle = '#6b6b6b';
      ctx.beginPath();
      ctx.moveTo(x + size / 2, y + size / 4);
      ctx.lineTo(x + (size * 3) / 4, y + (size * 3) / 4);
      ctx.lineTo(x + size / 4, y + (size * 3) / 4);
      ctx.closePath();
      ctx.fill();
      break;

    case 'agent':
      // Draw a simple character - circle for head, body
      // Head
      ctx.fillStyle = '#ffd4a3'; // Skin tone
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 3, size / 5, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = '#4a90e2'; // Blue shirt
      ctx.fillRect(
        x + size / 2 - size / 6,
        y + size / 2,
        size / 3,
        size / 2.5
      );
      break;

    default:
      // Default circle
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 3, 0, Math.PI * 2);
      ctx.fill();
  }
}
