/**
 * Simple sprite rendering (placeholders until we have real sprites).
 */

export function renderSprite(
  ctx: CanvasRenderingContext2D,
  spriteId: string,
  x: number,
  y: number,
  size: number,
  metadata?: any
): void {
  // IMPORTANT: Save and restore canvas state to prevent alpha/fill corruption
  ctx.save();

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

    case 'workbench':
      // Draw a workbench (table with tools)
      // Table legs
      ctx.fillStyle = '#4a3520'; // Dark brown
      ctx.fillRect(x + size * 0.2, y + size * 0.5, size * 0.1, size * 0.4);
      ctx.fillRect(x + size * 0.7, y + size * 0.5, size * 0.1, size * 0.4);

      // Table top
      ctx.fillStyle = '#8b6914'; // Light brown
      ctx.fillRect(x + size * 0.1, y + size * 0.4, size * 0.8, size * 0.15);

      // Tools on table (hammer)
      ctx.fillStyle = '#888'; // Gray metal
      ctx.fillRect(x + size * 0.3, y + size * 0.45, size * 0.15, size * 0.05);
      ctx.fillStyle = '#654321'; // Brown handle
      ctx.fillRect(x + size * 0.35, y + size * 0.48, size * 0.05, size * 0.1);
      break;

    case 'tent':
      // Draw a tent (triangular structure)
      // Main tent body
      ctx.fillStyle = '#8FBC8F'; // Dark sea green
      ctx.beginPath();
      ctx.moveTo(x + size * 0.5, y + size * 0.2);
      ctx.lineTo(x + size * 0.15, y + size * 0.8);
      ctx.lineTo(x + size * 0.85, y + size * 0.8);
      ctx.closePath();
      ctx.fill();

      // Tent entrance (darker triangle)
      ctx.fillStyle = '#556B2F'; // Dark olive green
      ctx.beginPath();
      ctx.moveTo(x + size * 0.5, y + size * 0.5);
      ctx.lineTo(x + size * 0.4, y + size * 0.8);
      ctx.lineTo(x + size * 0.6, y + size * 0.8);
      ctx.closePath();
      ctx.fill();
      break;

    case 'storage-chest':
      // Draw a larger storage chest (similar to storage-box but bigger)
      ctx.fillStyle = '#654321'; // Dark brown
      ctx.fillRect(x + size * 0.15, y + size * 0.35, size * 0.7, size * 0.5);

      // Lid
      ctx.fillStyle = '#8b6914'; // Lighter brown
      ctx.fillRect(x + size * 0.1, y + size * 0.25, size * 0.8, size * 0.15);

      // Lock/latch (larger)
      ctx.fillStyle = '#FFD700'; // Gold
      ctx.fillRect(x + size * 0.45, y + size * 0.5, size * 0.1, size * 0.2);

      // Keyhole
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(x + size * 0.5, y + size * 0.58, size * 0.02, 0, Math.PI * 2);
      ctx.fill();
      break;

    // Plant sprites
    case 'grass':
    case 'wildflower':
    case 'berry-bush':
    case 'wheat':
    case 'carrot':
    case 'potato':
    case 'tomato':
      renderPlantSprite(ctx, spriteId, x, y, size, metadata?.stage);
      break;

    // Animal sprites
    case 'chicken':
    case 'cow':
    case 'sheep':
    case 'horse':
    case 'dog':
    case 'cat':
    case 'rabbit':
    case 'deer':
    case 'pig':
    case 'goat':
      renderAnimalSprite(ctx, spriteId, x, y, size);
      break;

    default:
      // Default circle
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 3, 0, Math.PI * 2);
      ctx.fill();
  }

  // Restore canvas state
  ctx.restore();
}

/**
 * Render plant sprites with species-specific visuals and stage-based size/appearance
 */
function renderPlantSprite(
  ctx: CanvasRenderingContext2D,
  speciesId: string,
  x: number,
  y: number,
  size: number,
  stage?: string
): void {
  // Scale size based on stage
  let sizeMultiplier = 1.0;
  let alpha = 1.0;

  switch (stage) {
    case 'seed':
      sizeMultiplier = 0.2;
      alpha = 0.7;
      break;
    case 'germinating':
      sizeMultiplier = 0.3;
      alpha = 0.8;
      break;
    case 'sprout':
      sizeMultiplier = 0.5;
      break;
    case 'vegetative':
      sizeMultiplier = 0.75;
      break;
    case 'flowering':
    case 'fruiting':
    case 'mature':
      sizeMultiplier = 1.0;
      break;
    case 'seeding':
      sizeMultiplier = 1.0;
      alpha = 0.9;
      break;
    case 'senescence':
      sizeMultiplier = 0.9;
      alpha = 0.7;
      break;
    case 'decay':
      sizeMultiplier = 0.6;
      alpha = 0.5;
      break;
    case 'dead':
      sizeMultiplier = 0.3;
      alpha = 0.3;
      break;
    default:
      // Unknown stage, use full size
      break;
  }

  // Apply size and alpha
  const scaledSize = size * sizeMultiplier;
  const offsetX = (size - scaledSize) / 2;
  const offsetY = (size - scaledSize) / 2;

  ctx.globalAlpha = alpha;
  switch (speciesId) {
    case 'grass':
      // Simple grass blades - green (color varies by stage)
      const grassColor = stage === 'dead' ? '#8B7355' : stage === 'decay' ? '#A0826D' : '#228B22';
      ctx.strokeStyle = grassColor;
      ctx.lineWidth = scaledSize / 12;
      for (let i = 0; i < 3; i++) {
        const bladeX = x + offsetX + scaledSize * (0.3 + i * 0.2);
        ctx.beginPath();
        ctx.moveTo(bladeX, y + offsetY + scaledSize * 0.8);
        ctx.lineTo(bladeX, y + offsetY + scaledSize * 0.3);
        ctx.stroke();
      }
      break;

    case 'wildflower':
      // Flower with stem and petals
      // Stem
      ctx.strokeStyle = '#228B22';
      ctx.lineWidth = size / 16;
      ctx.beginPath();
      ctx.moveTo(x + size / 2, y + size * 0.8);
      ctx.lineTo(x + size / 2, y + size * 0.4);
      ctx.stroke();

      // Flower petals (pink/purple)
      ctx.fillStyle = '#FF69B4'; // Hot pink
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const petalX = x + size / 2 + Math.cos(angle) * size * 0.15;
        const petalY = y + size * 0.35 + Math.sin(angle) * size * 0.15;
        ctx.beginPath();
        ctx.arc(petalX, petalY, size / 10, 0, Math.PI * 2);
        ctx.fill();
      }

      // Center
      ctx.fillStyle = '#FFD700'; // Gold
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size * 0.35, size / 12, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'berry-bush':
      // Bushy shrub with berries
      // Foliage (dark green)
      ctx.fillStyle = '#2F4F2F'; // Dark green
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 3, 0, Math.PI * 2);
      ctx.fill();

      // Berries (red dots)
      ctx.fillStyle = '#DC143C'; // Crimson
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const berryX = x + size / 2 + Math.cos(angle) * size * 0.2;
        const berryY = y + size / 2 + Math.sin(angle) * size * 0.2;
        ctx.beginPath();
        ctx.arc(berryX, berryY, size / 16, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'wheat':
      // Wheat stalks with grain head
      ctx.strokeStyle = '#DAA520'; // Goldenrod
      ctx.lineWidth = size / 12;
      for (let i = 0; i < 3; i++) {
        const offsetX = x + size * (0.3 + i * 0.2);
        // Stalk
        ctx.beginPath();
        ctx.moveTo(offsetX, y + size * 0.9);
        ctx.lineTo(offsetX, y + size * 0.3);
        ctx.stroke();

        // Grain head (oval)
        ctx.fillStyle = '#DAA520';
        ctx.beginPath();
        ctx.ellipse(offsetX, y + size * 0.25, size / 12, size / 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'carrot':
      // Carrot greens above ground
      ctx.fillStyle = '#228B22'; // Green
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y + size / 2);
        ctx.lineTo(
          x + size / 2 + Math.cos(angle) * size * 0.3,
          y + size / 2 + Math.sin(angle) * size * 0.3
        );
        ctx.stroke();
      }
      // Center bulge (hint of orange below)
      ctx.fillStyle = '#FF8C00'; // Dark orange
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size * 0.6, size / 8, 0, Math.PI);
      ctx.fill();
      break;

    case 'potato':
      // Potato plant - leafy greens
      ctx.fillStyle = '#3CB371'; // Medium sea green
      // Multiple leaves
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const leafX = x + size / 2 + Math.cos(angle) * size * 0.2;
        const leafY = y + size / 2 + Math.sin(angle) * size * 0.2;
        ctx.beginPath();
        ctx.ellipse(leafX, leafY, size / 8, size / 6, angle, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'tomato':
      // Tomato plant with vine and fruit
      // Vine/stem
      ctx.strokeStyle = '#228B22';
      ctx.lineWidth = size / 16;
      ctx.beginPath();
      ctx.moveTo(x + size / 2, y + size * 0.8);
      ctx.lineTo(x + size / 2, y + size * 0.3);
      ctx.stroke();

      // Tomatoes (red)
      ctx.fillStyle = '#FF6347'; // Tomato red
      ctx.beginPath();
      ctx.arc(x + size * 0.4, y + size * 0.5, size / 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + size * 0.6, y + size * 0.45, size / 8, 0, Math.PI * 2);
      ctx.fill();

      // Leaves
      ctx.fillStyle = '#228B22';
      ctx.beginPath();
      ctx.arc(x + size * 0.3, y + size * 0.35, size / 10, 0, Math.PI * 2);
      ctx.fill();
      break;

    default:
      // Fallback for unknown plant
      ctx.fillStyle = '#90EE90'; // Light green
      ctx.beginPath();
      ctx.arc(x + offsetX + scaledSize / 2, y + offsetY + scaledSize / 2, scaledSize / 3, 0, Math.PI * 2);
      ctx.fill();
  }

  // Reset alpha
  ctx.globalAlpha = 1.0;
}

/**
 * Render animal sprites with species-specific visuals
 */
function renderAnimalSprite(
  ctx: CanvasRenderingContext2D,
  speciesId: string,
  x: number,
  y: number,
  size: number
): void {
  switch (speciesId) {
    case 'chicken':
      // White/beige body with red comb
      ctx.fillStyle = '#F5DEB3'; // Wheat/beige
      ctx.beginPath();
      ctx.ellipse(x + size / 2, y + size * 0.6, size * 0.3, size * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#F5DEB3';
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size * 0.35, size * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Red comb on top
      ctx.fillStyle = '#DC143C'; // Crimson
      ctx.beginPath();
      ctx.moveTo(x + size * 0.4, y + size * 0.25);
      ctx.lineTo(x + size * 0.45, y + size * 0.15);
      ctx.lineTo(x + size * 0.5, y + size * 0.2);
      ctx.lineTo(x + size * 0.55, y + size * 0.15);
      ctx.lineTo(x + size * 0.6, y + size * 0.25);
      ctx.fill();

      // Beak
      ctx.fillStyle = '#FFA500'; // Orange
      ctx.beginPath();
      ctx.moveTo(x + size * 0.6, y + size * 0.35);
      ctx.lineTo(x + size * 0.7, y + size * 0.35);
      ctx.lineTo(x + size * 0.65, y + size * 0.38);
      ctx.fill();
      break;

    case 'cow':
      // Brown/white spotted body
      ctx.fillStyle = '#FFFFFF'; // White
      ctx.beginPath();
      ctx.ellipse(x + size / 2, y + size * 0.6, size * 0.4, size * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Brown spots
      ctx.fillStyle = '#8B4513'; // Saddle brown
      ctx.beginPath();
      ctx.arc(x + size * 0.35, y + size * 0.55, size * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + size * 0.6, y + size * 0.65, size * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(x + size / 2, y + size * 0.35, size * 0.25, size * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ears
      ctx.fillStyle = '#F5DEB3';
      ctx.beginPath();
      ctx.ellipse(x + size * 0.3, y + size * 0.3, size * 0.08, size * 0.12, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + size * 0.7, y + size * 0.3, size * 0.08, size * 0.12, 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'sheep':
      // Fluffy white body
      ctx.fillStyle = '#F0F0F0'; // Very light gray (wool)
      // Draw fluffy circles for wool texture
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const fluffX = x + size / 2 + Math.cos(angle) * size * 0.15;
        const fluffY = y + size * 0.6 + Math.sin(angle) * size * 0.15;
        ctx.beginPath();
        ctx.arc(fluffX, fluffY, size * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dark face
      ctx.fillStyle = '#3C3C3C'; // Dark gray
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size * 0.35, size * 0.15, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'horse':
      // Brown body
      ctx.fillStyle = '#8B4513'; // Saddle brown
      ctx.beginPath();
      ctx.ellipse(x + size / 2, y + size * 0.6, size * 0.35, size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Long neck
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(x + size * 0.45, y + size * 0.25, size * 0.1, size * 0.35);

      // Head
      ctx.fillStyle = '#8B4513';
      ctx.beginPath();
      ctx.ellipse(x + size * 0.5, y + size * 0.25, size * 0.15, size * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Mane
      ctx.fillStyle = '#654321'; // Dark brown
      ctx.fillRect(x + size * 0.48, y + size * 0.25, size * 0.04, size * 0.3);

      // Ears
      ctx.fillStyle = '#8B4513';
      ctx.beginPath();
      ctx.moveTo(x + size * 0.45, y + size * 0.2);
      ctx.lineTo(x + size * 0.42, y + size * 0.15);
      ctx.lineTo(x + size * 0.48, y + size * 0.2);
      ctx.fill();
      break;

    case 'dog':
      // Brown dog body
      ctx.fillStyle = '#D2691E'; // Chocolate
      ctx.beginPath();
      ctx.ellipse(x + size / 2, y + size * 0.6, size * 0.35, size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#D2691E';
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size * 0.35, size * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Ears (floppy)
      ctx.fillStyle = '#A0522D'; // Sienna
      ctx.beginPath();
      ctx.ellipse(x + size * 0.35, y + size * 0.35, size * 0.08, size * 0.15, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + size * 0.65, y + size * 0.35, size * 0.08, size * 0.15, 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Snout
      ctx.fillStyle = '#8B4513';
      ctx.beginPath();
      ctx.ellipse(x + size * 0.5, y + size * 0.42, size * 0.1, size * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tail (wagging up)
      ctx.strokeStyle = '#D2691E';
      ctx.lineWidth = size * 0.08;
      ctx.beginPath();
      ctx.moveTo(x + size * 0.75, y + size * 0.6);
      ctx.quadraticCurveTo(x + size * 0.85, y + size * 0.45, x + size * 0.8, y + size * 0.35);
      ctx.stroke();
      break;

    case 'cat':
      // Orange/ginger cat
      ctx.fillStyle = '#FF8C42'; // Orange
      ctx.beginPath();
      ctx.ellipse(x + size / 2, y + size * 0.65, size * 0.3, size * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#FF8C42';
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size * 0.38, size * 0.18, 0, Math.PI * 2);
      ctx.fill();

      // Pointy ears
      ctx.fillStyle = '#FF8C42';
      ctx.beginPath();
      ctx.moveTo(x + size * 0.35, y + size * 0.3);
      ctx.lineTo(x + size * 0.3, y + size * 0.2);
      ctx.lineTo(x + size * 0.4, y + size * 0.28);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + size * 0.65, y + size * 0.3);
      ctx.lineTo(x + size * 0.7, y + size * 0.2);
      ctx.lineTo(x + size * 0.6, y + size * 0.28);
      ctx.fill();

      // Stripes
      ctx.strokeStyle = '#D2691E'; // Darker orange
      ctx.lineWidth = size * 0.03;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + size * 0.35, y + size * (0.6 + i * 0.08));
        ctx.lineTo(x + size * 0.65, y + size * (0.6 + i * 0.08));
        ctx.stroke();
      }

      // Tail (curled up)
      ctx.strokeStyle = '#FF8C42';
      ctx.lineWidth = size * 0.08;
      ctx.beginPath();
      ctx.moveTo(x + size * 0.7, y + size * 0.7);
      ctx.quadraticCurveTo(x + size * 0.85, y + size * 0.6, x + size * 0.75, y + size * 0.45);
      ctx.stroke();
      break;

    case 'rabbit':
      // Gray/white rabbit
      ctx.fillStyle = '#D3D3D3'; // Light gray
      // Round fluffy body
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size * 0.65, size * 0.25, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#D3D3D3';
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size * 0.4, size * 0.18, 0, Math.PI * 2);
      ctx.fill();

      // Long ears
      ctx.fillStyle = '#D3D3D3';
      ctx.beginPath();
      ctx.ellipse(x + size * 0.42, y + size * 0.25, size * 0.08, size * 0.2, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + size * 0.58, y + size * 0.25, size * 0.08, size * 0.2, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Pink inner ears
      ctx.fillStyle = '#FFB6C1'; // Light pink
      ctx.beginPath();
      ctx.ellipse(x + size * 0.42, y + size * 0.25, size * 0.04, size * 0.12, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + size * 0.58, y + size * 0.25, size * 0.04, size * 0.12, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Cotton tail
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(x + size * 0.7, y + size * 0.7, size * 0.1, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'deer':
      // Brown deer
      ctx.fillStyle = '#A0522D'; // Sienna
      ctx.beginPath();
      ctx.ellipse(x + size / 2, y + size * 0.6, size * 0.35, size * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Neck
      ctx.fillStyle = '#A0522D';
      ctx.fillRect(x + size * 0.45, y + size * 0.3, size * 0.1, size * 0.3);

      // Head
      ctx.fillStyle = '#A0522D';
      ctx.beginPath();
      ctx.ellipse(x + size * 0.5, y + size * 0.3, size * 0.15, size * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Antlers (simple Y-shape)
      ctx.strokeStyle = '#8B4513'; // Saddle brown
      ctx.lineWidth = size * 0.04;
      // Left antler
      ctx.beginPath();
      ctx.moveTo(x + size * 0.42, y + size * 0.25);
      ctx.lineTo(x + size * 0.38, y + size * 0.15);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + size * 0.38, y + size * 0.18);
      ctx.lineTo(x + size * 0.35, y + size * 0.12);
      ctx.stroke();
      // Right antler
      ctx.beginPath();
      ctx.moveTo(x + size * 0.58, y + size * 0.25);
      ctx.lineTo(x + size * 0.62, y + size * 0.15);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + size * 0.62, y + size * 0.18);
      ctx.lineTo(x + size * 0.65, y + size * 0.12);
      ctx.stroke();

      // White belly spot
      ctx.fillStyle = '#F5F5DC'; // Beige
      ctx.beginPath();
      ctx.ellipse(x + size / 2, y + size * 0.7, size * 0.2, size * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'pig':
      // Pink pig
      ctx.fillStyle = '#FFB6C1'; // Light pink
      ctx.beginPath();
      ctx.ellipse(x + size / 2, y + size * 0.65, size * 0.4, size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#FFB6C1';
      ctx.beginPath();
      ctx.ellipse(x + size / 2, y + size * 0.38, size * 0.25, size * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();

      // Snout
      ctx.fillStyle = '#FF69B4'; // Hot pink (darker)
      ctx.beginPath();
      ctx.ellipse(x + size * 0.5, y + size * 0.42, size * 0.15, size * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Nostrils
      ctx.fillStyle = '#C71585'; // Medium violet red
      ctx.beginPath();
      ctx.arc(x + size * 0.45, y + size * 0.42, size * 0.03, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + size * 0.55, y + size * 0.42, size * 0.03, 0, Math.PI * 2);
      ctx.fill();

      // Ears
      ctx.fillStyle = '#FFB6C1';
      ctx.beginPath();
      ctx.ellipse(x + size * 0.35, y + size * 0.32, size * 0.08, size * 0.1, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + size * 0.65, y + size * 0.32, size * 0.08, size * 0.1, 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Curly tail
      ctx.strokeStyle = '#FFB6C1';
      ctx.lineWidth = size * 0.06;
      ctx.beginPath();
      ctx.arc(x + size * 0.75, y + size * 0.65, size * 0.08, Math.PI, Math.PI * 2.5);
      ctx.stroke();
      break;

    case 'goat':
      // White/beige goat
      ctx.fillStyle = '#F5F5DC'; // Beige
      ctx.beginPath();
      ctx.ellipse(x + size / 2, y + size * 0.6, size * 0.35, size * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#F5F5DC';
      ctx.beginPath();
      ctx.ellipse(x + size / 2, y + size * 0.35, size * 0.2, size * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Horns (curved)
      ctx.strokeStyle = '#696969'; // Dim gray
      ctx.lineWidth = size * 0.05;
      ctx.beginPath();
      ctx.arc(x + size * 0.38, y + size * 0.28, size * 0.12, Math.PI * 1.2, Math.PI * 0.3, true);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + size * 0.62, y + size * 0.28, size * 0.12, Math.PI * 0.7, Math.PI * 1.8, false);
      ctx.stroke();

      // Beard
      ctx.fillStyle = '#D2B48C'; // Tan
      ctx.beginPath();
      ctx.moveTo(x + size * 0.5, y + size * 0.45);
      ctx.lineTo(x + size * 0.45, y + size * 0.52);
      ctx.lineTo(x + size * 0.55, y + size * 0.52);
      ctx.fill();

      // Ears
      ctx.fillStyle = '#F5F5DC';
      ctx.beginPath();
      ctx.ellipse(x + size * 0.38, y + size * 0.32, size * 0.06, size * 0.1, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + size * 0.62, y + size * 0.32, size * 0.06, size * 0.1, 0.5, 0, Math.PI * 2);
      ctx.fill();
      break;

    default:
      // Fallback for unknown animal (should not happen)
      ctx.fillStyle = '#FFA500'; // Orange
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 3, 0, Math.PI * 2);
      ctx.fill();
  }
}
