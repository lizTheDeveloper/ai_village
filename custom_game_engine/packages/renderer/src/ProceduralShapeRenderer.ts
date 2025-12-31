/**
 * Renders procedural shapes (trees, rocks, mountains) for side-view mode.
 * Extracted from Renderer for better separation of concerns.
 */
export class ProceduralShapeRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Update the canvas context reference.
   */
  setContext(ctx: CanvasRenderingContext2D): void {
    this.ctx = ctx;
  }

  /**
   * Create a seeded random number generator.
   */
  createSeededRandom(seed: number): () => number {
    let currentSeed = seed;
    return () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
  }

  /**
   * Draw a procedural tree in side-view mode.
   * Creates a trunk with layered canopy that looks like a real tree.
   */
  drawTree(
    centerX: number,
    groundY: number,
    trunkWidth: number,
    totalHeight: number,
    canopyWidth: number,
    opacity: number,
    seed: number
  ): void {
    this.ctx.globalAlpha = opacity;
    const random = this.createSeededRandom(seed);

    const trunkHeight = totalHeight * 0.4;
    const canopyHeight = totalHeight * 0.7;

    // Draw trunk
    const trunkX = centerX - trunkWidth / 2;
    const trunkY = groundY - trunkHeight;

    // Trunk gradient (lighter in middle)
    const trunkGradient = this.ctx.createLinearGradient(trunkX, 0, trunkX + trunkWidth, 0);
    trunkGradient.addColorStop(0, '#4A3728');
    trunkGradient.addColorStop(0.3, '#6B4423');
    trunkGradient.addColorStop(0.7, '#6B4423');
    trunkGradient.addColorStop(1, '#4A3728');

    this.ctx.fillStyle = trunkGradient;
    this.ctx.fillRect(trunkX, trunkY, trunkWidth, trunkHeight);

    // Trunk texture (bark lines)
    this.ctx.strokeStyle = '#3E2723';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < trunkHeight; i += 6) {
      const offset = (i % 12 < 6) ? 1 : -1;
      this.ctx.beginPath();
      this.ctx.moveTo(trunkX + 2, trunkY + i);
      this.ctx.lineTo(trunkX + trunkWidth / 2 + offset * 2, trunkY + i + 3);
      this.ctx.lineTo(trunkX + trunkWidth - 2, trunkY + i + 1);
      this.ctx.stroke();
    }

    // Draw canopy as layered circles/ellipses
    const canopyY = groundY - totalHeight;
    const numLayers = 4;

    for (let layer = 0; layer < numLayers; layer++) {
      const layerRatio = layer / numLayers;
      const layerY = canopyY + canopyHeight * layerRatio * 0.6;
      const layerWidth = canopyWidth * (1 - layerRatio * 0.3);
      const layerHeight = canopyHeight * 0.35;

      // Color gets lighter towards top
      const greenBase = 40 + layer * 15;
      const greenHigh = 100 + layer * 20;
      this.ctx.fillStyle = `rgb(${30 + layer * 10}, ${greenBase + Math.floor(random() * 20)}, ${20 + layer * 5})`;

      // Draw ellipse for this layer
      this.ctx.beginPath();
      this.ctx.ellipse(centerX, layerY + layerHeight / 2, layerWidth / 2, layerHeight / 2, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Add some texture dots
      this.ctx.fillStyle = `rgb(${50 + layer * 15}, ${greenHigh}, ${30 + layer * 10})`;
      for (let dot = 0; dot < 5; dot++) {
        const dotX = centerX + (random() - 0.5) * layerWidth * 0.7;
        const dotY = layerY + random() * layerHeight * 0.8;
        const dotSize = 2 + random() * 3;
        this.ctx.beginPath();
        this.ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  /**
   * Draw a procedural rock formation in side-view mode.
   */
  drawRock(
    x: number,
    y: number,
    width: number,
    height: number,
    opacity: number,
    seed: number
  ): void {
    this.ctx.globalAlpha = opacity;
    const random = this.createSeededRandom(seed);

    // Draw stacked rock shapes
    const numRocks = Math.max(1, Math.floor(height / (width * 0.6)));
    const rockHeight = height / numRocks;

    for (let i = 0; i < numRocks; i++) {
      const rockY = y + i * rockHeight;
      const rockWidth = width * (0.7 + random() * 0.3);
      const rockX = x + (width - rockWidth) / 2 + (random() - 0.5) * width * 0.2;

      // Rock color (gray with variation)
      const grayBase = 80 + Math.floor(random() * 40);
      this.ctx.fillStyle = `rgb(${grayBase}, ${grayBase - 5}, ${grayBase - 10})`;

      // Draw rock as polygon
      this.ctx.beginPath();
      this.ctx.moveTo(rockX + rockWidth * 0.1, rockY + rockHeight);
      this.ctx.lineTo(rockX, rockY + rockHeight * 0.3);
      this.ctx.lineTo(rockX + rockWidth * 0.3, rockY);
      this.ctx.lineTo(rockX + rockWidth * 0.7, rockY + rockHeight * 0.1);
      this.ctx.lineTo(rockX + rockWidth, rockY + rockHeight * 0.4);
      this.ctx.lineTo(rockX + rockWidth * 0.9, rockY + rockHeight);
      this.ctx.closePath();
      this.ctx.fill();

      // Add highlight
      this.ctx.fillStyle = `rgba(255, 255, 255, 0.15)`;
      this.ctx.beginPath();
      this.ctx.moveTo(rockX + rockWidth * 0.2, rockY + rockHeight * 0.2);
      this.ctx.lineTo(rockX + rockWidth * 0.4, rockY + rockHeight * 0.1);
      this.ctx.lineTo(rockX + rockWidth * 0.5, rockY + rockHeight * 0.3);
      this.ctx.closePath();
      this.ctx.fill();

      // Add shadow
      this.ctx.fillStyle = `rgba(0, 0, 0, 0.2)`;
      this.ctx.beginPath();
      this.ctx.moveTo(rockX + rockWidth * 0.6, rockY + rockHeight * 0.7);
      this.ctx.lineTo(rockX + rockWidth * 0.9, rockY + rockHeight * 0.5);
      this.ctx.lineTo(rockX + rockWidth * 0.85, rockY + rockHeight);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  /**
   * Draw a procedural mountain in side-view mode.
   * Creates a triangular peak with snow cap and rock texture.
   */
  drawMountain(
    centerX: number,
    groundY: number,
    baseWidth: number,
    height: number,
    opacity: number,
    seed: number
  ): void {
    this.ctx.globalAlpha = opacity;
    const random = this.createSeededRandom(seed);

    const peakY = groundY - height;
    const leftX = centerX - baseWidth / 2;
    const rightX = centerX + baseWidth / 2;

    // Main mountain body - gradient from dark at bottom to lighter at top
    const mountainGradient = this.ctx.createLinearGradient(0, groundY, 0, peakY);
    mountainGradient.addColorStop(0, '#4a4a4a');
    mountainGradient.addColorStop(0.4, '#6b6b6b');
    mountainGradient.addColorStop(0.7, '#8a8a8a');
    mountainGradient.addColorStop(1, '#a0a0a0');

    this.ctx.fillStyle = mountainGradient;
    this.ctx.beginPath();
    this.ctx.moveTo(leftX, groundY);
    this.ctx.lineTo(centerX, peakY);
    this.ctx.lineTo(rightX, groundY);
    this.ctx.closePath();
    this.ctx.fill();

    // Add rocky texture - jagged lines
    this.ctx.strokeStyle = '#3a3a3a';
    this.ctx.lineWidth = 1;
    const numRidges = Math.floor(height / 15);
    for (let i = 0; i < numRidges; i++) {
      const ridgeY = groundY - (height * (i + 1)) / (numRidges + 1);
      const ridgeWidth = baseWidth * (1 - (i + 1) / (numRidges + 2));
      const ridgeLeftX = centerX - ridgeWidth / 2;
      const ridgeRightX = centerX + ridgeWidth / 2;

      this.ctx.beginPath();
      this.ctx.moveTo(ridgeLeftX, ridgeY);
      const numJags = 3 + Math.floor(random() * 3);
      for (let j = 1; j <= numJags; j++) {
        const jagX = ridgeLeftX + (ridgeWidth * j) / (numJags + 1);
        const jagY = ridgeY + (random() - 0.5) * 8;
        this.ctx.lineTo(jagX, jagY);
      }
      this.ctx.lineTo(ridgeRightX, ridgeY);
      this.ctx.stroke();
    }

    // Snow cap on tall mountains (height > 60px)
    if (height > 60) {
      const snowHeight = height * 0.25;
      const snowY = peakY + snowHeight;
      const snowWidth = baseWidth * 0.35;

      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.moveTo(centerX - snowWidth / 2, snowY);
      this.ctx.lineTo(centerX, peakY);
      this.ctx.lineTo(centerX + snowWidth / 2, snowY);
      this.ctx.quadraticCurveTo(centerX + snowWidth / 4, snowY + 5, centerX, snowY + 3);
      this.ctx.quadraticCurveTo(centerX - snowWidth / 4, snowY + 5, centerX - snowWidth / 2, snowY);
      this.ctx.closePath();
      this.ctx.fill();

      // Snow highlights
      this.ctx.fillStyle = 'rgba(200, 220, 255, 0.5)';
      this.ctx.beginPath();
      this.ctx.moveTo(centerX - snowWidth / 4, snowY - snowHeight * 0.3);
      this.ctx.lineTo(centerX - snowWidth / 8, peakY + 3);
      this.ctx.lineTo(centerX, snowY - snowHeight * 0.5);
      this.ctx.closePath();
      this.ctx.fill();
    }

    // Shadow on right side
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, peakY);
    this.ctx.lineTo(rightX, groundY);
    this.ctx.lineTo(centerX + baseWidth * 0.1, groundY);
    this.ctx.closePath();
    this.ctx.fill();
  }
}
