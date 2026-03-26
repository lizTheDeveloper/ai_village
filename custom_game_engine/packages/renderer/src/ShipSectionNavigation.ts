import { Camera } from './Camera.js';

export interface ShipSection {
  id: string;
  name: string;
  centerX: number;
  centerY: number;
  zoomLevel: number;
}

export const DEFAULT_SHIP_SECTIONS: ShipSection[] = [
  {
    id: 'deck_1',
    name: 'Deck 1 - Bridge',
    centerX: 0,
    centerY: 100,
    zoomLevel: 1.5,
  },
  {
    id: 'deck_2',
    name: 'Deck 2 - Crew Quarters',
    centerX: 0,
    centerY: 300,
    zoomLevel: 1.5,
  },
  {
    id: 'deck_3',
    name: 'Deck 3 - Science Lab',
    centerX: 0,
    centerY: 500,
    zoomLevel: 1.5,
  },
  {
    id: 'deck_4',
    name: 'Deck 4 - Medical Bay',
    centerX: 0,
    centerY: 700,
    zoomLevel: 1.5,
  },
  {
    id: 'deck_5',
    name: 'Deck 5 - Engineering',
    centerX: 0,
    centerY: 900,
    zoomLevel: 1.5,
  },
  {
    id: 'deck_6',
    name: 'Deck 6 - Cargo Hold',
    centerX: 0,
    centerY: 1100,
    zoomLevel: 1.5,
  },
];

export class ShipSectionNavigator {
  sections: ShipSection[];
  currentSectionIndex: number;

  constructor() {
    this.sections = [...DEFAULT_SHIP_SECTIONS];
    this.currentSectionIndex = -1;
  }

  setSections(sections: ShipSection[]): void {
    if (!sections || sections.length === 0) {
      throw new Error('ShipSectionNavigator.setSections: sections array must be non-empty');
    }
    this.sections = sections;
    this.currentSectionIndex = -1;
  }

  navigateToSection(camera: Camera, sectionIndex: number): void {
    if (sectionIndex < 0 || sectionIndex >= this.sections.length) {
      throw new Error(
        `ShipSectionNavigator.navigateToSection: index ${sectionIndex} is out of range (0-${this.sections.length - 1})`
      );
    }
    const section = this.sections[sectionIndex]!;
    this.currentSectionIndex = sectionIndex;
    camera.setPosition(section.centerX, section.centerY);
    camera.setZoom(section.zoomLevel);
  }

  navigateToOverview(camera: Camera): void {
    if (this.sections.length === 0) {
      throw new Error('ShipSectionNavigator.navigateToOverview: no sections defined');
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const section of this.sections) {
      if (section.centerX < minX) minX = section.centerX;
      if (section.centerX > maxX) maxX = section.centerX;
      if (section.centerY < minY) minY = section.centerY;
      if (section.centerY > maxY) maxY = section.centerY;
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const contentWidth = maxX - minX + 200;
    const contentHeight = maxY - minY + 200;

    const zoomX = camera.viewportWidth / contentWidth;
    const zoomY = camera.viewportHeight / contentHeight;
    const fitZoom = Math.min(zoomX, zoomY);

    this.currentSectionIndex = -1;
    camera.setPosition(centerX, centerY);
    camera.setZoom(fitZoom);
  }

  navigateToNextSection(camera: Camera): number {
    if (this.sections.length === 0) {
      throw new Error('ShipSectionNavigator.navigateToNextSection: no sections defined');
    }
    const nextIndex =
      this.currentSectionIndex === -1
        ? 0
        : (this.currentSectionIndex + 1) % this.sections.length;
    this.navigateToSection(camera, nextIndex);
    return nextIndex;
  }

  navigateToPreviousSection(camera: Camera): number {
    if (this.sections.length === 0) {
      throw new Error('ShipSectionNavigator.navigateToPreviousSection: no sections defined');
    }
    const prevIndex =
      this.currentSectionIndex === -1
        ? this.sections.length - 1
        : (this.currentSectionIndex - 1 + this.sections.length) % this.sections.length;
    this.navigateToSection(camera, prevIndex);
    return prevIndex;
  }

  findNearestSection(worldX: number, worldY: number): number {
    if (this.sections.length === 0) {
      throw new Error('ShipSectionNavigator.findNearestSection: no sections defined');
    }

    let nearestIndex = 0;
    let nearestDistanceSq = Infinity;

    for (let i = 0; i < this.sections.length; i++) {
      const section = this.sections[i]!;
      const dx = section.centerX - worldX;
      const dy = section.centerY - worldY;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq < nearestDistanceSq) {
        nearestDistanceSq = distanceSq;
        nearestIndex = i;
      }
    }

    return nearestIndex;
  }

  isOverview(): boolean {
    return this.currentSectionIndex === -1;
  }
}
