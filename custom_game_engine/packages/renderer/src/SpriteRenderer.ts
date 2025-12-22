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

    case 'campfire':
      // Draw a campfire with flames
      // Logs (brown crossed lines)
      ctx.strokeStyle = '#4a3520';
      ctx.lineWidth = size / 8;
      ctx.beginPath();
      ctx.moveTo(x + size / 4, y + size * 0.6);
      ctx.lineTo(x + size * 0.75, y + size * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + size * 0.4, y + size * 0.7);
      ctx.lineTo(x + size * 0.6, y + size * 0.5);
      ctx.stroke();

      // Flames (orange and yellow)
      ctx.fillStyle = '#ff6b00'; // Orange flame
      ctx.beginPath();
      ctx.moveTo(x + size / 2, y + size * 0.2);
      ctx.lineTo(x + size * 0.35, y + size * 0.6);
      ctx.lineTo(x + size * 0.65, y + size * 0.6);
      ctx.closePath();
      ctx.fill();

      // Yellow inner flame
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.moveTo(x + size / 2, y + size * 0.3);
      ctx.lineTo(x + size * 0.42, y + size * 0.55);
      ctx.lineTo(x + size * 0.58, y + size * 0.55);
      ctx.closePath();
      ctx.fill();
      break;

    case 'lean-to':
      // Draw a simple lean-to shelter (triangle with support)
      ctx.fillStyle = '#8b6914'; // Brown
      ctx.beginPath();
      ctx.moveTo(x + size * 0.2, y + size * 0.8);
      ctx.lineTo(x + size / 2, y + size * 0.2);
      ctx.lineTo(x + size * 0.8, y + size * 0.8);
      ctx.closePath();
      ctx.fill();

      // Support pole
      ctx.fillStyle = '#4a3520';
      ctx.fillRect(x + size * 0.1, y + size * 0.3, size / 12, size * 0.5);
      break;

    case 'storage-box':
      // Draw a storage box (rectangular chest)
      ctx.fillStyle = '#654321'; // Dark brown
      ctx.fillRect(x + size * 0.2, y + size * 0.4, size * 0.6, size * 0.5);

      // Lid
      ctx.fillStyle = '#8b6914'; // Lighter brown
      ctx.fillRect(x + size * 0.15, y + size * 0.3, size * 0.7, size * 0.15);

      // Lock/latch
      ctx.fillStyle = '#888';
      ctx.fillRect(x + size * 0.47, y + size * 0.5, size * 0.06, size * 0.15);
      break;

    default:
      // Default circle
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 3, 0, Math.PI * 2);
      ctx.fill();
  }
}
