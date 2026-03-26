/**
 * seed-content.ts — Seeds the content Postgres database from hardcoded
 * TypeScript registries and JSON data files.
 *
 * Usage:
 *   CONTENT_DATABASE_URL=postgres://... npx tsx demo/server/seed-content.ts
 *
 * Safe to re-run: all inserts use ON CONFLICT DO UPDATE (upsert).
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Species registries
import { SPECIES_REGISTRY } from '../../packages/core/src/species/SpeciesRegistry.js';
import { MAGICAL_SPECIES_REGISTRY } from '../../packages/core/src/species/MagicalSpeciesRegistry.js';
import { FOLKLORIST_SPECIES_REGISTRY } from '../../packages/core/src/species/FolkloristSpeciesRegistry.js';
import { SPRINT13_FOLKLORIST_SPECIES_REGISTRY } from '../../packages/core/src/species/Sprint13FolkloristSpeciesRegistry.js';
import { SPRINT14_FOLKLORIST_SPECIES_REGISTRY } from '../../packages/core/src/species/Sprint14FolkloristSpeciesRegistry.js';

// Songs
import { MVEE_SONG_CATALOGUE } from '../../packages/core/src/data/mvee-songs.js';
import { NORN_SONG_CATALOGUE } from '../../packages/core/src/lore/SongSystem.js';

import type { SpeciesTemplate } from '../../packages/core/src/species/SpeciesRegistry.js';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMA_SQL_PATH = path.resolve(
  __dirname, '..', '..', '..', '..', 'folkfork-portal', 'db', 'content-schema.sql',
);

const ITEMS_DIR = path.resolve(
  __dirname, '..', '..', 'packages', 'core', 'data', 'items',
);

const BUILDINGS_JSON_PATH = path.resolve(
  __dirname, '..', '..', 'packages', 'core', 'data', 'buildings.json',
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

// ---------------------------------------------------------------------------
// Species upsert
// ---------------------------------------------------------------------------

async function seedSpecies(client: pg.Client): Promise<number> {
  const registries: Array<{ registry: Record<string, SpeciesTemplate>; source: string }> = [
    { registry: SPECIES_REGISTRY,                  source: 'base' },
    { registry: MAGICAL_SPECIES_REGISTRY,          source: 'magical' },
    { registry: FOLKLORIST_SPECIES_REGISTRY,       source: 'folklorist' },
    { registry: SPRINT13_FOLKLORIST_SPECIES_REGISTRY, source: 'sprint13' },
    { registry: SPRINT14_FOLKLORIST_SPECIES_REGISTRY, source: 'sprint14' },
  ];

  let count = 0;

  for (const { registry, source } of registries) {
    for (const [, species] of Object.entries(registry)) {
      await client.query(
        `INSERT INTO species (
          species_id, species_name, common_name, description,
          body_plan_id, innate_traits, compatible_species, mutation_rate,
          average_height, average_weight, size_category,
          lifespan, lifespan_type, maturity_age, gestation_period,
          sapient, social_structure, native_language_id,
          traveler_epithet, cross_game_compatible, native_game,
          genome_flags, precursors_lineage, source_registry
        ) VALUES (
          $1,  $2,  $3,  $4,
          $5,  $6,  $7,  $8,
          $9,  $10, $11,
          $12, $13, $14, $15,
          $16, $17, $18,
          $19, $20, $21,
          $22, $23, $24
        )
        ON CONFLICT (species_id) DO UPDATE SET
          species_name          = EXCLUDED.species_name,
          common_name           = EXCLUDED.common_name,
          description           = EXCLUDED.description,
          body_plan_id          = EXCLUDED.body_plan_id,
          innate_traits         = EXCLUDED.innate_traits,
          compatible_species    = EXCLUDED.compatible_species,
          mutation_rate         = EXCLUDED.mutation_rate,
          average_height        = EXCLUDED.average_height,
          average_weight        = EXCLUDED.average_weight,
          size_category         = EXCLUDED.size_category,
          lifespan              = EXCLUDED.lifespan,
          lifespan_type         = EXCLUDED.lifespan_type,
          maturity_age          = EXCLUDED.maturity_age,
          gestation_period      = EXCLUDED.gestation_period,
          sapient               = EXCLUDED.sapient,
          social_structure      = EXCLUDED.social_structure,
          native_language_id    = EXCLUDED.native_language_id,
          traveler_epithet      = EXCLUDED.traveler_epithet,
          cross_game_compatible = EXCLUDED.cross_game_compatible,
          native_game           = EXCLUDED.native_game,
          genome_flags          = EXCLUDED.genome_flags,
          precursors_lineage    = EXCLUDED.precursors_lineage,
          source_registry       = EXCLUDED.source_registry,
          updated_at            = NOW()`,
        [
          species.speciesId,
          species.speciesName,
          species.commonName,
          (species as SpeciesTemplate & { description?: string }).description ?? '',
          species.bodyPlanId,
          JSON.stringify(species.innateTraits ?? []),
          JSON.stringify(species.compatibleSpecies ?? []),
          species.mutationRate,
          species.averageHeight,
          species.averageWeight,
          species.sizeCategory,
          (species as SpeciesTemplate & { lifespan?: number }).lifespan ?? 0,
          species.lifespanType,
          species.maturityAge,
          species.gestationPeriod,
          (species as SpeciesTemplate & { sapient?: boolean }).sapient ?? true,
          species.socialStructure ?? null,
          species.nativeLanguageId ?? null,
          species.traveler_epithet ?? null,
          species.cross_game_compatible ?? false,
          species.native_game ?? 'mvee',
          species.genome_flags != null ? JSON.stringify(species.genome_flags) : null,
          species.precursors_lineage != null ? JSON.stringify(species.precursors_lineage) : null,
          source,
        ],
      );
      count++;
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Songs upsert
// ---------------------------------------------------------------------------

async function seedSongs(client: pg.Client): Promise<number> {
  const catalogues = [
    { entries: MVEE_SONG_CATALOGUE, catalog: 'mvee', basePath: '/audio/mvee/' },
    { entries: NORN_SONG_CATALOGUE, catalog: 'norn', basePath: '/audio/norn/' },
  ];

  let count = 0;

  for (const { entries, catalog, basePath } of catalogues) {
    for (const entry of entries) {
      await client.query(
        `INSERT INTO songs (filename, occasion, catalog, mp3_path)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (catalog, filename) DO UPDATE SET
           occasion   = EXCLUDED.occasion,
           mp3_path   = EXCLUDED.mp3_path,
           updated_at = NOW()`,
        [
          entry.filename,
          entry.occasion,
          catalog,
          `${basePath}${entry.filename}`,
        ],
      );
      count++;
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Items upsert
// ---------------------------------------------------------------------------

async function seedItems(client: pg.Client): Promise<number> {
  const jsonFiles = fs
    .readdirSync(ITEMS_DIR)
    .filter((f) => f.endsWith('.json'));

  let count = 0;

  for (const filename of jsonFiles) {
    const category = filename.replace(/\.json$/, '');
    const filePath = path.join(ITEMS_DIR, filename);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const items: Array<Record<string, unknown>> = JSON.parse(raw);

    for (const item of items) {
      const { id, displayName, name: itemName, ...rest } = item as {
        id: string;
        displayName?: string;
        name?: string;
        [key: string]: unknown;
      };
      const displayLabel = displayName ?? itemName ?? id;

      await client.query(
        `INSERT INTO items (item_id, display_name, category, properties)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (item_id) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           category     = EXCLUDED.category,
           properties   = EXCLUDED.properties,
           updated_at   = NOW()`,
        [id, displayLabel, category, JSON.stringify(rest)],
      );
      count++;
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Buildings upsert
// ---------------------------------------------------------------------------

async function seedBuildings(client: pg.Client): Promise<number> {
  const raw = fs.readFileSync(BUILDINGS_JSON_PATH, 'utf-8');
  const parsed: { buildings: Array<Record<string, unknown>> } = JSON.parse(raw);
  const buildings = parsed.buildings;

  let count = 0;

  for (const building of buildings) {
    const { id, name, category, ...rest } = building as {
      id: string;
      name: string;
      category: string;
      [key: string]: unknown;
    };

    await client.query(
      `INSERT INTO buildings (building_id, name, category, properties)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (building_id) DO UPDATE SET
         name       = EXCLUDED.name,
         category   = EXCLUDED.category,
         properties = EXCLUDED.properties,
         updated_at = NOW()`,
      [id, name, category ?? null, JSON.stringify(rest)],
    );
    count++;
  }

  return count;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const databaseUrl = requireEnv('CONTENT_DATABASE_URL');

  const client = new pg.Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    console.log('Connected to Postgres.');

    // 1. Run schema SQL to ensure tables exist
    console.log(`Running schema SQL: ${SCHEMA_SQL_PATH}`);
    const schemaSql = fs.readFileSync(SCHEMA_SQL_PATH, 'utf-8');
    await client.query(schemaSql);
    console.log('Schema applied.');

    // 2. Species
    console.log('Seeding species...');
    const speciesCount = await seedSpecies(client);
    console.log(`  ${speciesCount} species upserted.`);

    // 3. Songs
    console.log('Seeding songs...');
    const songCount = await seedSongs(client);
    console.log(`  ${songCount} songs upserted.`);

    // 4. Lore fragments
    // NOTE: Lore fragments are NOT seeded here. The hardcoded data in
    // LoreFragmentComponent.ts defines categories and importance levels,
    // but actual fragment content is generated at runtime by the game
    // engine (procedural lore generation). The lore_fragments table will
    // be populated by the game runtime or a future admin import tool.
    console.log('Lore fragments: skipped (populated by game runtime).');

    // 5. Items
    console.log('Seeding items...');
    const itemCount = await seedItems(client);
    console.log(`  ${itemCount} items upserted.`);

    // 6. Buildings
    console.log('Seeding buildings...');
    const buildingCount = await seedBuildings(client);
    console.log(`  ${buildingCount} buildings upserted.`);

    // Summary
    console.log('\n--- Seed complete ---');
    console.log(`  Species:   ${speciesCount}`);
    console.log(`  Songs:     ${songCount}`);
    console.log(`  Items:     ${itemCount}`);
    console.log(`  Buildings: ${buildingCount}`);
    console.log(`  Lore:      (runtime-generated, not seeded)`);
  } finally {
    await client.end();
  }
}

main().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
