import { AbstractTierBase } from './AbstractTierBase.js';
import type { UniversalAddress, CulturalIdentity } from './types.js';

export class AbstractMegasegment extends AbstractTierBase {
  // Megasegment-specific properties
  cultures: CulturalIdentity[] = [];
  techLevel: number;
  stabilityIndex: number = 1.0;  // 0-1
  phenomena: string[] = [];  // Special regional phenomena

  constructor(id: string, name: string, address: Partial<UniversalAddress>) {
    super(id, name, 'megasegment', address, 'abstract');

    // Random tech level (0-10)
    this.techLevel = Math.floor(Math.random() * 11);

    // Generate cultures
    this.cultures = this.generateCultures();

    // Random phenomena
    if (Math.random() > 0.7) {
      this.phenomena.push(this.selectRandomPhenomenon());
    }

    // Stability affected by phenomena
    this.stabilityIndex = 1.0 - (this.phenomena.length * 0.1);
  }

  private generateCultures(): CulturalIdentity[] {
    const cultures: CulturalIdentity[] = [];
    const cultureCount = 1 + Math.floor(Math.random() * 5);  // 1-5 cultures

    const names = [
      'Crystal Collective',
      'Silicon Confederation',
      'Flesh Zealots',
      'Worldforge Drones',
      'Prime Merchants',
      'Shadow Weavers',
      'Star Pilgrims',
      'Void Traders'
    ];

    const languages = [
      'Resonance',
      'Binary Pulse',
      'Organic Song',
      'Machine Code',
      'Trade Cant',
      'Shadow Speak',
      'Star Tongue',
      'Void Whisper'
    ];

    for (let i = 0; i < cultureCount; i++) {
      const popShare = this.population.total / cultureCount;
      cultures.push({
        name: names[Math.floor(Math.random() * names.length)],
        language: languages[Math.floor(Math.random() * languages.length)],
        techLevel: this.techLevel + Math.floor(Math.random() * 3) - 1,
        traditions: this.generateTraditions(),
        population: Math.floor(popShare),
        growthRate: 0.001 + Math.random() * 0.002
      });
    }

    return cultures;
  }

  private generateTraditions(): string[] {
    const allTraditions = [
      'crystal_singing',
      'hive_mind_meditation',
      'geometric_art',
      'ritual_combat',
      'ancestor_worship',
      'dimensional_pilgrimage',
      'tech_veneration',
      'void_gazing'
    ];

    const count = 2 + Math.floor(Math.random() * 3);
    const traditions: string[] = [];

    for (let i = 0; i < count; i++) {
      const tradition = allTraditions[Math.floor(Math.random() * allTraditions.length)];
      if (!traditions.includes(tradition)) {
        traditions.push(tradition);
      }
    }

    return traditions;
  }

  private selectRandomPhenomenon(): string {
    const phenomena = [
      'dimensional_rift',
      'time_dilation_field',
      'reality_crystallization',
      'void_breach',
      'ancient_superweapon',
      'Builder_ruins',
      'unstable_portal',
      'temporal_anomaly'
    ];

    return phenomena[Math.floor(Math.random() * phenomena.length)];
  }

  protected updateAbstract(deltaTime: number): void {
    super.updateAbstract(deltaTime);

    // Update cultures
    for (const culture of this.cultures) {
      culture.population *= (1 + culture.growthRate * deltaTime);
    }

    // Phenomena affect stability
    if (this.phenomena.length > 0) {
      this.stabilityIndex = Math.max(0.5, this.stabilityIndex - 0.001 * deltaTime);
    } else {
      this.stabilityIndex = Math.min(1.0, this.stabilityIndex + 0.001 * deltaTime);
    }

    // Low stability reduces efficiency
    if (this.stabilityIndex < 0.8) {
      for (const [resource, production] of this.economy.production) {
        this.economy.production.set(resource, production * this.stabilityIndex);
      }
    }
  }

  toJSON(): any {
    return {
      ...super.toJSON(),
      cultures: this.cultures,
      techLevel: this.techLevel,
      stabilityIndex: this.stabilityIndex,
      phenomena: this.phenomena
    };
  }
}
