import { AbstractGigasegment } from '../abstraction/AbstractGigasegment.js';
import { AbstractMegasegment } from '../abstraction/AbstractMegasegment.js';
import { AbstractTierBase } from '../abstraction/AbstractTierBase.js';
import type { AbstractTier, UniversalAddress } from '../abstraction/types.js';

/**
 * Generates mock hierarchical data for testing
 */
export class DataGenerator {
  generateHierarchy(depth: number = 3): AbstractTier {
    // Start with gigasegment 0
    const gigaseg = new AbstractGigasegment(
      'gigaseg_0',
      'Ringworld Alpha',
      { gigasegment: 0 }
    );

    if (depth <= 0) return gigaseg;

    // Generate 3-5 megasegments as examples
    const megasegCount = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < megasegCount; i++) {
      const megaseg = new AbstractMegasegment(
        `megaseg_${i}`,
        this.generateMegasegmentName(),
        {
          gigasegment: 0,
          megasegment: i
        }
      );

      gigaseg.addChild(megaseg);

      if (depth > 1) {
        // Generate a few subsections for first megasegment
        if (i === 0) {
          this.generateSubsections(megaseg, depth - 1);
        }
      }
    }

    // Generate diplomatic relations between gigasegments (for future expansion)
    this.generateDiplomaticRelations(gigaseg);

    return gigaseg;
  }

  private generateSubsections(parent: AbstractTier, depth: number): void {
    const count = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const subsection = new AbstractTierBase(
        `${parent.id}_subsection_${i}`,
        this.generateSubsectionName(),
        'subsection',
        {
          ...parent.address,
          subsection: i
        },
        'abstract'
      );

      parent.addChild(subsection);

      if (depth > 1) {
        // Generate regions for first subsection
        if (i === 0) {
          this.generateRegions(subsection, depth - 1);
        }
      }
    }
  }

  private generateRegions(parent: AbstractTier, depth: number): void {
    const count = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const region = new AbstractTierBase(
        `${parent.id}_region_${i}`,
        this.generateRegionName(),
        'region',
        {
          ...parent.address,
          region: i
        },
        'abstract'
      );

      parent.addChild(region);

      if (depth > 1) {
        // Generate zones for first region
        if (i === 0) {
          this.generateZones(region, depth - 1);
        }
      }
    }
  }

  private generateZones(parent: AbstractTier, _depth: number): void {
    const count = 2 + Math.floor(Math.random() * 2);

    for (let i = 0; i < count; i++) {
      const zone = new AbstractTierBase(
        `${parent.id}_zone_${i}`,
        this.generateZoneName(),
        'zone',
        {
          ...parent.address,
          zone: i
        },
        'abstract'
      );

      parent.addChild(zone);

      // Don't generate chunks/tiles for now (too many)
    }
  }

  private generateMegasegmentName(): string {
    const names = [
      'The Great Spire',
      'Crystal Wastes',
      'Worldforge Territory',
      'Prime Meridian',
      'Shadow Reach',
      'Stellar Gardens',
      'Void Boundary',
      'Ancient Ruins',
      'Builder\'s End',
      'The Confluence'
    ];

    return names[Math.floor(Math.random() * names.length)];
  }

  private generateSubsectionName(): string {
    const prefixes = ['Northern', 'Southern', 'Eastern', 'Western', 'Central'];
    const types = ['District', 'Quarter', 'Territory', 'Sector', 'Zone'];

    return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${types[Math.floor(Math.random() * types.length)]}`;
  }

  private generateRegionName(): string {
    const adjectives = ['Ancient', 'New', 'Old', 'Forbidden', 'Sacred', 'Lost'];
    const nouns = ['Plaza', 'Market', 'Gardens', 'Ruins', 'Temple', 'Port'];

    return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
  }

  private generateZoneName(): string {
    const types = ['Block', 'Avenue', 'Square', 'Circle', 'Complex'];
    const num = Math.floor(Math.random() * 100);

    return `${types[Math.floor(Math.random() * types.length)]} ${num}`;
  }

  private generateDiplomaticRelations(gigaseg: AbstractTier): void {
    // Generate relations with other (non-existent) gigasegments
    const otherGigasegs = ['gigaseg_1', 'gigaseg_2', 'gigaseg_3'];

    if (gigaseg instanceof AbstractGigasegment) {
      for (const otherId of otherGigasegs) {
        const relationship = -1 + Math.random() * 2;  // -1 to 1
        gigaseg.addDiplomaticRelation(otherId, relationship);
      }
    }
  }
}

export const dataGenerator = new DataGenerator();
