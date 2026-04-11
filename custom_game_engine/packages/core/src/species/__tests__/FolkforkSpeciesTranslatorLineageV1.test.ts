// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  getSpeciesMigrationStatus,
  parseSpeciesLineageV1,
  registerFolkforkSpecies,
  translateToSpeciesTemplate,
  type SpeciesLineageV1,
} from '../FolkforkSpeciesTranslator.js';
import { SPECIES_REGISTRY } from '../SpeciesRegistry.js';

const ADZEFIRE_REGISTRY_KEY = 'folkfork_adzefire';

function loadAdzefirePayload(): SpeciesLineageV1 {
  const candidates = [
    // From custom_game_engine/ → multiverse_games/ (3 levels up)
    resolve(process.cwd(), '../../../akashic-records/genetics/examples/adzefire-lineage-v1.json'),
    // Legacy candidate paths kept for compatibility
    resolve(process.cwd(), '../../../../../akashic-records/genetics/examples/adzefire-lineage-v1.json'),
    resolve(process.cwd(), 'akashic-records/genetics/examples/adzefire-lineage-v1.json'),
  ];

  const path = candidates.find((candidate) => existsSync(candidate));
  if (!path) {
    throw new Error('Could not locate adzefire-lineage-v1.json sample payload');
  }

  const raw = readFileSync(path, 'utf-8');
  return parseSpeciesLineageV1(JSON.parse(raw));
}

function withMigrationStatus(
  payload: SpeciesLineageV1,
  migrationStatus: SpeciesLineageV1['migrationMetadata']['migrationStatus'],
  overrides: Partial<SpeciesLineageV1['migrationMetadata']> = {},
): SpeciesLineageV1 {
  return {
    ...payload,
    migrationMetadata: {
      ...payload.migrationMetadata,
      migrationStatus,
      ...overrides,
    },
  };
}

afterEach(() => {
  delete (SPECIES_REGISTRY as Record<string, unknown>)[ADZEFIRE_REGISTRY_KEY];
});

describe('Folkfork species_lineage_v1 support (MUL-4696)', () => {
  it('parses and maps Adzefire lineage v1 contract fields', () => {
    const payload = loadAdzefirePayload();
    const template = translateToSpeciesTemplate(payload);

    expect(template.speciesId).toBe('folkfork_adzefire');
    expect(template.speciesName).toBe('Adzefire');

    expect(template.culturalProtocol).toMatchObject({
      livingTradition: true,
    });
    expect(template.culturalProtocol?.avoidances?.length ?? 0).toBeGreaterThan(0);

    expect(template.ecologyProfile).toMatchObject({
      socialStructure: 'colony',
      activityPattern: 'nocturnal',
      populationDensity: 'uncommon',
    });

    expect(template.visualIdentity?.bioluminescent).toBe(true);
    expect(template.loreDepth?.mythCount).toBe(5);
    expect(template.lineageContractV1?.canonicalName).toBe('Adzefire');
    expect(template.migrationMetadata?.migrationStatus).toBe('candidate');
  });

  it('blocks transition to approved without dual sign-off', () => {
    const payload = loadAdzefirePayload();
    const invalid = withMigrationStatus(payload, 'approved', {
      scheherazadeSignoff: true,
      sylviaSignoff: false,
    });

    expect(() => registerFolkforkSpecies(invalid)).toThrow(/requires both scheherazadeSignoff and sylviaSignoff/);
  });

  it('tracks migration progression history in the species registry', () => {
    const payload = loadAdzefirePayload();

    registerFolkforkSpecies(withMigrationStatus(payload, 'candidate'));
    registerFolkforkSpecies(withMigrationStatus(payload, 'reviewed'));
    registerFolkforkSpecies(
      withMigrationStatus(payload, 'approved', {
        scheherazadeSignoff: true,
        sylviaSignoff: true,
      }),
    );

    const active = registerFolkforkSpecies(
      withMigrationStatus(payload, 'active_in_target', {
        scheherazadeSignoff: true,
        sylviaSignoff: true,
      }),
    );

    expect(active.migrationMetadata?.migrationStatus).toBe('active_in_target');
    expect(getSpeciesMigrationStatus('adzefire')).toBe('active_in_target');
    expect(active.migrationStatusHistory?.map((entry) => `${entry.from}->${entry.to}`)).toEqual([
      'candidate->reviewed',
      'reviewed->approved',
      'approved->migrated',
      'migrated->active_in_target',
    ]);
  });

  it('maps MUL-4697 behavior archetype fields into species behavior profile', () => {
    const inlinePayload = parseSpeciesLineageV1({
      formatVersion: '1.0.0',
      speciesId: 'adzefire_inline',
      canonicalName: 'Adzefire Inline',
      sourceGame: 'precursors',
      folkloreTradition: {
        primaryTradition: 'Ewe',
        culturalOrigin: 'Ghana',
        sourceAttribution: 'Akashic Inline Fixture',
        culturalProtocol: {
          livingTradition: true,
          respectNotes: 'Handle with ritual respect',
          avoidances: ['mockery'],
        },
      },
      ecologicalProfile: {
        ecologicalRole: 'predator',
        diet: 'carnivore',
        biomePreferences: ['wetland'],
        sizeClass: 'small',
        bodyPlan: 'insectoid',
        socialStructure: 'colony',
        activityPattern: 'nocturnal',
        populationDensity: 'uncommon',
      },
      behavioralArchetype: {
        archetypeSeed: 'parasite_symbiont',
        cognitiveCeiling: 0.72,
        personalityBaseline: {
          curiosity: 0.88,
          aggression: 0.31,
          sociability: 0.79,
          fearfulness: 0.21,
          playfulness: 0.42,
          empathy: 0.36,
          stubbornness: 0.52,
          creativity: 0.74,
        },
        uniqueBehaviors: [
          {
            behaviorId: 'gradient_following',
            description: 'Tracks thermal gradients to locate hosts',
            triggerHint: 'foraging_gradient',
          },
          {
            behaviorId: 'bioluminescent_relay',
            description: 'Pulsed relay communication across the colony',
            triggerHint: 'idle_relay',
          },
        ],
        interspeciesRelations: [
          {
            targetSpeciesId: 'norn',
            disposition: 'predatory',
            description: 'Seeks vulnerable sleepers',
          },
          {
            targetSpeciesId: 'quetzali',
            disposition: 'fearful',
            description: 'Avoids ritual fire circles',
          },
        ],
      },
      visualIdentity: {
        primaryHueRange: [30, 40],
        secondaryHueRange: [160, 190],
        bioluminescent: true,
        distinctiveFeatures: ['glass-wing pattern'],
      },
      migrationMetadata: {
        migrationStatus: 'candidate',
        sourceGameVersion: '1.2.3',
      },
    });

    const template = translateToSpeciesTemplate(inlinePayload);
    const behaviorProfile = template.speciesBehaviorProfile;

    expect(behaviorProfile).toBeDefined();
    expect(behaviorProfile?.cognitiveCeiling).toBeCloseTo(0.72, 5);
    expect(behaviorProfile?.personalityBaseline?.curiosity).toBeCloseTo(0.88, 5);
    expect(behaviorProfile?.uniqueBehaviors.map((entry) => entry.behaviorId)).toEqual([
      'gradient_following',
      'bioluminescent_relay',
    ]);
    expect(behaviorProfile?.interspeciesRelations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ targetSpeciesId: 'norn', disposition: 'predatory' }),
        expect.objectContaining({ targetSpeciesId: 'quetzali', disposition: 'fearful' }),
      ]),
    );
  });
});
