/**
 * GhostPreview - Stateful ghost preview manager for building placement.
 *
 * This class manages the state of a ghost preview and uses GhostRenderer for rendering.
 * It implements the API expected by the TDD tests.
 *
 * Implements: REQ-BPLACE-002 (Ghost Preview)
 */

import type { BuildingBlueprint, PlacementValidationResult, PlacementError } from '@ai-village/core';
import { GhostRenderer, type GhostState } from './GhostRenderer.js';

export interface GhostPreviewState {
  blueprint: BuildingBlueprint | undefined;
  position: { x: number; y: number };
  rotation: number;
  isActive: boolean;
  isValid: boolean;
  errors: PlacementError[];
}

export interface RenderOptions {
  zoom: number;
}

/**
 * Manages ghost preview state for building placement.
 */
export class GhostPreview {
  private blueprint: BuildingBlueprint | undefined;
  private position: { x: number; y: number } = { x: 0, y: 0 };
  private rotation: number = 0;
  private valid: boolean = true;
  private errors: PlacementError[] = [];
  private readonly tileSize = 16;
  private readonly ghostRenderer: GhostRenderer;

  constructor() {
    this.ghostRenderer = new GhostRenderer();
  }

  /**
   * Set the blueprint for the ghost preview.
   * @throws Error if blueprint is null/undefined
   */
  setBlueprint(blueprint: BuildingBlueprint): void {
    if (!blueprint) {
      throw new Error('Blueprint is required to create ghost preview');
    }
    this.blueprint = blueprint;
    this.rotation = 0;
  }

  /**
   * Get the current blueprint.
   */
  getBlueprint(): BuildingBlueprint | undefined {
    return this.blueprint;
  }

  /**
   * Check if the ghost preview is active.
   */
  isActive(): boolean {
    return this.blueprint !== undefined;
  }

  /**
   * Clear the ghost preview.
   */
  clear(): void {
    this.blueprint = undefined;
    this.rotation = 0;
    this.valid = true;
    this.errors = [];
  }

  /**
   * Update the ghost position.
   * @throws Error if no blueprint is set
   */
  updatePosition(position: { x: number; y: number }): void {
    if (!this.blueprint) {
      throw new Error('Cannot update position without active blueprint');
    }

    if (this.blueprint.snapToGrid) {
      // Snap to 16px grid
      this.position = {
        x: Math.floor(position.x / this.tileSize) * this.tileSize,
        y: Math.floor(position.y / this.tileSize) * this.tileSize,
      };
    } else {
      this.position = { ...position };
    }
  }

  /**
   * Get the current position.
   */
  getPosition(): { x: number; y: number } {
    return { ...this.position };
  }

  /**
   * Set the rotation angle.
   * @throws Error if rotation is not a valid number or not allowed by blueprint
   */
  setRotation(rotation: number): void {
    if (typeof rotation !== 'number') {
      throw new Error('Rotation must be a number');
    }
    if (this.blueprint && !this.blueprint.rotationAngles.includes(rotation)) {
      throw new Error(`Rotation ${rotation} is not allowed for this building`);
    }
    this.rotation = rotation;
  }

  /**
   * Get the current rotation.
   */
  getRotation(): number {
    return this.rotation;
  }

  /**
   * Rotate clockwise to the next allowed angle.
   */
  rotateClockwise(): void {
    if (!this.blueprint || !this.blueprint.canRotate) {
      return;
    }

    const angles = this.blueprint.rotationAngles;
    const currentIndex = angles.indexOf(this.rotation);
    const nextIndex = (currentIndex + 1) % angles.length;
    this.rotation = angles[nextIndex] ?? 0;
  }

  /**
   * Rotate counter-clockwise to the previous allowed angle.
   */
  rotateCounterClockwise(): void {
    if (!this.blueprint || !this.blueprint.canRotate) {
      return;
    }

    const angles = this.blueprint.rotationAngles;
    const currentIndex = angles.indexOf(this.rotation);
    const nextIndex = (currentIndex - 1 + angles.length) % angles.length;
    this.rotation = angles[nextIndex] ?? 0;
  }

  /**
   * Set the validity state from validation result.
   */
  setValidity(result: PlacementValidationResult): void {
    this.valid = result.valid;
    this.errors = result.errors;
  }

  /**
   * Check if the current placement is valid.
   */
  isValid(): boolean {
    return this.valid;
  }

  /**
   * Get the tint color based on validity.
   */
  getTintColor(): { r: number; g: number; b: number; a: number } {
    return this.valid
      ? { r: 0, g: 255, b: 0, a: 0.3 }
      : { r: 255, g: 0, b: 0, a: 0.3 };
  }

  /**
   * Get the validation errors.
   */
  getErrors(): PlacementError[] {
    return [...this.errors];
  }

  /**
   * Check if a specific tile is valid.
   */
  getTileValidity(tileX: number, tileY: number): boolean {
    // Check if any errors affect this tile
    for (const error of this.errors) {
      for (const tile of error.affectedTiles) {
        if (tile.x === tileX && tile.y === tileY) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Get the full state object.
   */
  getState(): GhostPreviewState {
    return {
      blueprint: this.blueprint,
      position: { ...this.position },
      rotation: this.rotation,
      isActive: this.isActive(),
      isValid: this.valid,
      errors: [...this.errors],
    };
  }

  /**
   * Render the ghost preview.
   * @throws Error if no blueprint is set
   */
  render(ctx: CanvasRenderingContext2D, options: RenderOptions): void {
    if (!this.blueprint) {
      throw new Error('Cannot render ghost without active blueprint');
    }

    const ghostState: GhostState = {
      blueprintId: this.blueprint.id,
      position: this.position,
      rotation: this.rotation,
      isValid: this.valid,
      width: this.blueprint.width,
      height: this.blueprint.height,
    };

    // Apply zoom
    ctx.save();
    ctx.scale(options.zoom, options.zoom);

    this.ghostRenderer.render(
      ctx,
      ghostState,
      this.position.x,
      this.position.y,
      1 // Zoom already applied
    );

    ctx.restore();
  }
}
