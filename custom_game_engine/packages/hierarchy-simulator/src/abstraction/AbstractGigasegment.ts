import { AbstractTierBase } from './AbstractTierBase.js';
import type { UniversalAddress, TransportHub } from './types.js';

export class AbstractGigasegment extends AbstractTierBase {
  // Gigasegment-specific properties
  luxuryGoodsExports: Map<string, number> = new Map();
  culturalInfluence: number = 0;
  diplomaticRelations: Map<string, number> = new Map();  // gigaseg ID -> relationship (-1 to 1)

  constructor(id: string, name: string, address: Partial<UniversalAddress>) {
    super(id, name, 'gigasegment', address, 'abstract');

    // Gigasegments have massive transport hubs
    this.transportHubs = this.generateTransportHubs();

    // Initialize luxury goods
    this.luxuryGoodsExports.set('clarketech_devices', Math.random() * 1_000_000);
    this.luxuryGoodsExports.set('dimensional_anchors', Math.random() * 10_000);
    this.luxuryGoodsExports.set('music_crystals', Math.random() * 500_000);
    this.luxuryGoodsExports.set('masterwork_art', Math.random() * 50_000);

    // Cultural influence (0-100)
    this.culturalInfluence = Math.random() * 100;
  }

  private generateTransportHubs(): TransportHub[] {
    const hubs: TransportHub[] = [];
    const hubCount = 10 + Math.floor(Math.random() * 10);  // 10-20 hubs

    for (let i = 0; i < hubCount; i++) {
      hubs.push({
        id: `${this.id}_hub_${i}`,
        type: Math.random() > 0.5 ? 'spaceport' : 'warp_gate',
        position: {
          x: Math.random() * 1000,
          y: Math.random() * 1000
        },
        capacity: Math.floor(Math.random() * 1_000_000),
        connections: [],  // Will be populated later
        operational: Math.random() > 0.1  // 90% operational
      });
    }

    return hubs;
  }

  protected updateAbstract(deltaTime: number): void {
    super.updateAbstract(deltaTime);

    // Update cultural influence based on luxury goods exports
    let totalExports = 0;
    for (const amount of this.luxuryGoodsExports.values()) {
      totalExports += amount;
    }

    this.culturalInfluence += (totalExports / 1_000_000) * deltaTime * 0.001;
    this.culturalInfluence = Math.min(100, this.culturalInfluence);

    // Trade balance from luxury goods
    this.economy.tradeBalance += totalExports * 1000 * deltaTime;  // High value per unit
  }

  addDiplomaticRelation(gigasegmentId: string, relationship: number): void {
    this.diplomaticRelations.set(gigasegmentId, Math.max(-1, Math.min(1, relationship)));
  }

  toJSON(): any {
    return {
      ...super.toJSON(),
      luxuryGoodsExports: Array.from(this.luxuryGoodsExports.entries()),
      culturalInfluence: this.culturalInfluence,
      diplomaticRelations: Array.from(this.diplomaticRelations.entries())
    };
  }
}
