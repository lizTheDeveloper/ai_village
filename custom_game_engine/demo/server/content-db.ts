/**
 * Content DB — Postgres connection and query helpers for the content service.
 *
 * Connects to the `folkfork_lore_admin` database via the CONTENT_DATABASE_URL
 * env var.  If that var is unset the module exports null-returning stubs so
 * JSON-file or in-memory fallbacks can kick in (same graceful-degradation
 * pattern as folkfork-portal/db/db.js).
 */

import pg from 'pg';

const { Pool } = pg;

// ---------------------------------------------------------------------------
// Row types (match Postgres column names exactly)
// ---------------------------------------------------------------------------

export interface SpeciesSummaryRow {
  species_id:            string;
  species_name:          string;
  common_name:           string;
  description:           string;
  size_category:         string;
  lifespan_type:         string;
  sapient:               boolean;
  cross_game_compatible: boolean;
  native_game:           string | null;
  source_registry:       string | null;
}

export interface SpeciesRow extends SpeciesSummaryRow {
  id:                 string;
  body_plan_id:       string;
  innate_traits:      unknown[];
  compatible_species: string[];
  mutation_rate:      string;   // NUMERIC comes back as string from pg
  average_height:     number;
  average_weight:     number;
  lifespan:           number;
  maturity_age:       number;
  gestation_period:   number;
  social_structure:   string | null;
  native_language_id: string | null;
  traveler_epithet:   string | null;
  genome_flags:       unknown | null;
  precursors_lineage: unknown | null;
  created_at:         Date;
  updated_at:         Date;
}

export interface SongRow {
  id:         string;
  filename:   string;
  occasion:   string;
  catalog:    string;
  mp3_path:   string | null;
  created_at: Date;
  updated_at: Date;
}

export interface LoreFragmentRow {
  id:          string;
  fragment_id: string;
  title:       string;
  author:      string;
  content:     string;
  category:    string;
  importance:  string;
  tags:        string[];
  created_at:  Date;
  updated_at:  Date;
}

export interface ItemRow {
  id:           string;
  item_id:      string;
  display_name: string;
  category:     string;
  properties:   Record<string, unknown>;
  created_at:   Date;
  updated_at:   Date;
}

export interface BuildingRow {
  id:          string;
  building_id: string;
  name:        string;
  category:    string | null;
  properties:  Record<string, unknown>;
  created_at:  Date;
  updated_at:  Date;
}

export interface VoiceConfigRow {
  id:         string;
  species_id: string;
  voice_id:   string;
  enabled:    boolean;
  metadata:   unknown | null;
  created_at: Date;
  updated_at: Date;
}

// ---------------------------------------------------------------------------
// Input types (omit id, created_at, updated_at)
// ---------------------------------------------------------------------------

export interface UpsertSpeciesInput {
  species_id:            string;
  species_name:          string;
  common_name:           string;
  description:           string;
  body_plan_id:          string;
  innate_traits?:        unknown[];
  compatible_species?:   string[];
  mutation_rate?:        number;
  average_height:        number;
  average_weight:        number;
  size_category:         string;
  lifespan:              number;
  lifespan_type:         string;
  maturity_age:          number;
  gestation_period:      number;
  sapient?:              boolean;
  social_structure?:     string | null;
  native_language_id?:   string | null;
  traveler_epithet?:     string | null;
  cross_game_compatible?: boolean;
  native_game?:          string | null;
  genome_flags?:         unknown | null;
  precursors_lineage?:   unknown | null;
  source_registry?:      string | null;
}

export interface UpsertSongInput {
  filename:  string;
  occasion:  string;
  catalog:   string;
  mp3_path?: string | null;
}

export interface UpsertLoreFragmentInput {
  fragment_id: string;
  title:       string;
  author:      string;
  content:     string;
  category:    string;
  importance?: string;
  tags?:       string[];
}

export interface UpsertItemInput {
  item_id:      string;
  display_name: string;
  category:     string;
  properties?:  Record<string, unknown>;
}

export interface UpsertBuildingInput {
  building_id: string;
  name:        string;
  category?:   string | null;
  properties?: Record<string, unknown>;
}

export interface UpsertVoiceConfigInput {
  species_id: string;
  voice_id:   string;
  enabled?:   boolean;
  metadata?:  unknown | null;
}

// ---------------------------------------------------------------------------
// Pool
// ---------------------------------------------------------------------------

let _pool: pg.Pool | null = null;

export function getContentPool(): pg.Pool | null {
  if (!_pool) {
    if (!process.env.CONTENT_DATABASE_URL) {
      return null; // signal to caller: no Postgres available
    }
    _pool = new Pool({ connectionString: process.env.CONTENT_DATABASE_URL });
  }
  return _pool;
}

// ---------------------------------------------------------------------------
// Species
// ---------------------------------------------------------------------------

export async function listAllSpecies(): Promise<SpeciesSummaryRow[] | null> {
  const pool = getContentPool();
  if (!pool) return null;
  const { rows } = await pool.query<SpeciesSummaryRow>(
    `SELECT species_id, species_name, common_name, description,
            size_category, lifespan_type, sapient,
            cross_game_compatible, native_game, source_registry
     FROM species
     ORDER BY species_name ASC`
  );
  return rows;
}

export async function getSpeciesById(speciesId: string): Promise<SpeciesRow | null> {
  const pool = getContentPool();
  if (!pool) return null;
  const { rows } = await pool.query<SpeciesRow>(
    'SELECT * FROM species WHERE species_id = $1',
    [speciesId]
  );
  return rows[0] ?? null;
}

export async function upsertSpecies(species: UpsertSpeciesInput): Promise<SpeciesRow> {
  const pool = getContentPool();
  if (!pool) throw new Error('Postgres unavailable');
  const { rows } = await pool.query<SpeciesRow>(
    `INSERT INTO species (
       species_id, species_name, common_name, description,
       body_plan_id, innate_traits, compatible_species, mutation_rate,
       average_height, average_weight, size_category,
       lifespan, lifespan_type, maturity_age, gestation_period,
       sapient, social_structure, native_language_id, traveler_epithet,
       cross_game_compatible, native_game,
       genome_flags, precursors_lineage, source_registry
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
       $16,$17,$18,$19,$20,$21,$22,$23,$24
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
       updated_at            = NOW()
     RETURNING *`,
    [
      species.species_id,
      species.species_name,
      species.common_name,
      species.description,
      species.body_plan_id,
      JSON.stringify(species.innate_traits ?? []),
      JSON.stringify(species.compatible_species ?? []),
      species.mutation_rate ?? 0.01,
      species.average_height,
      species.average_weight,
      species.size_category,
      species.lifespan,
      species.lifespan_type,
      species.maturity_age,
      species.gestation_period,
      species.sapient ?? true,
      species.social_structure ?? null,
      species.native_language_id ?? null,
      species.traveler_epithet ?? null,
      species.cross_game_compatible ?? false,
      species.native_game ?? 'mvee',
      species.genome_flags != null ? JSON.stringify(species.genome_flags) : null,
      species.precursors_lineage != null ? JSON.stringify(species.precursors_lineage) : null,
      species.source_registry ?? null,
    ]
  );
  return rows[0];
}

export async function deleteSpecies(speciesId: string): Promise<boolean> {
  const pool = getContentPool();
  if (!pool) throw new Error('Postgres unavailable');
  const { rowCount } = await pool.query(
    'DELETE FROM species WHERE species_id = $1',
    [speciesId]
  );
  return (rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Songs
// ---------------------------------------------------------------------------

export async function listSongs(catalog?: string): Promise<SongRow[] | null> {
  const pool = getContentPool();
  if (!pool) return null;
  if (catalog !== undefined) {
    const { rows } = await pool.query<SongRow>(
      'SELECT * FROM songs WHERE catalog = $1 ORDER BY filename ASC',
      [catalog]
    );
    return rows;
  }
  const { rows } = await pool.query<SongRow>(
    'SELECT * FROM songs ORDER BY catalog ASC, filename ASC'
  );
  return rows;
}

export async function upsertSong(song: UpsertSongInput): Promise<SongRow> {
  const pool = getContentPool();
  if (!pool) throw new Error('Postgres unavailable');
  const { rows } = await pool.query<SongRow>(
    `INSERT INTO songs (filename, occasion, catalog, mp3_path)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (catalog, filename) DO UPDATE SET
       occasion   = EXCLUDED.occasion,
       mp3_path   = EXCLUDED.mp3_path,
       updated_at = NOW()
     RETURNING *`,
    [
      song.filename,
      song.occasion,
      song.catalog,
      song.mp3_path ?? null,
    ]
  );
  return rows[0];
}

export async function deleteSong(catalog: string, filename: string): Promise<boolean> {
  const pool = getContentPool();
  if (!pool) throw new Error('Postgres unavailable');
  const { rowCount } = await pool.query(
    'DELETE FROM songs WHERE catalog = $1 AND filename = $2',
    [catalog, filename]
  );
  return (rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Lore Fragments
// ---------------------------------------------------------------------------

export async function listLoreFragments(category?: string): Promise<LoreFragmentRow[] | null> {
  const pool = getContentPool();
  if (!pool) return null;
  if (category !== undefined) {
    const { rows } = await pool.query<LoreFragmentRow>(
      'SELECT * FROM lore_fragments WHERE category = $1 ORDER BY importance DESC, title ASC',
      [category]
    );
    return rows;
  }
  const { rows } = await pool.query<LoreFragmentRow>(
    'SELECT * FROM lore_fragments ORDER BY importance DESC, title ASC'
  );
  return rows;
}

export async function getLoreFragment(fragmentId: string): Promise<LoreFragmentRow | null> {
  const pool = getContentPool();
  if (!pool) return null;
  const { rows } = await pool.query<LoreFragmentRow>(
    'SELECT * FROM lore_fragments WHERE fragment_id = $1',
    [fragmentId]
  );
  return rows[0] ?? null;
}

export async function upsertLoreFragment(fragment: UpsertLoreFragmentInput): Promise<LoreFragmentRow> {
  const pool = getContentPool();
  if (!pool) throw new Error('Postgres unavailable');
  const { rows } = await pool.query<LoreFragmentRow>(
    `INSERT INTO lore_fragments (fragment_id, title, author, content, category, importance, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (fragment_id) DO UPDATE SET
       title      = EXCLUDED.title,
       author     = EXCLUDED.author,
       content    = EXCLUDED.content,
       category   = EXCLUDED.category,
       importance = EXCLUDED.importance,
       tags       = EXCLUDED.tags,
       updated_at = NOW()
     RETURNING *`,
    [
      fragment.fragment_id,
      fragment.title,
      fragment.author,
      fragment.content,
      fragment.category,
      fragment.importance ?? 'minor',
      JSON.stringify(fragment.tags ?? []),
    ]
  );
  return rows[0];
}

export async function deleteLoreFragment(fragmentId: string): Promise<boolean> {
  const pool = getContentPool();
  if (!pool) throw new Error('Postgres unavailable');
  const { rowCount } = await pool.query(
    'DELETE FROM lore_fragments WHERE fragment_id = $1',
    [fragmentId]
  );
  return (rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export async function listItems(category?: string): Promise<ItemRow[] | null> {
  const pool = getContentPool();
  if (!pool) return null;
  if (category !== undefined) {
    const { rows } = await pool.query<ItemRow>(
      'SELECT * FROM items WHERE category = $1 ORDER BY display_name ASC',
      [category]
    );
    return rows;
  }
  const { rows } = await pool.query<ItemRow>(
    'SELECT * FROM items ORDER BY category ASC, display_name ASC'
  );
  return rows;
}

export async function getItem(itemId: string): Promise<ItemRow | null> {
  const pool = getContentPool();
  if (!pool) return null;
  const { rows } = await pool.query<ItemRow>(
    'SELECT * FROM items WHERE item_id = $1',
    [itemId]
  );
  return rows[0] ?? null;
}

export async function upsertItem(item: UpsertItemInput): Promise<ItemRow> {
  const pool = getContentPool();
  if (!pool) throw new Error('Postgres unavailable');
  const { rows } = await pool.query<ItemRow>(
    `INSERT INTO items (item_id, display_name, category, properties)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (item_id) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       category     = EXCLUDED.category,
       properties   = EXCLUDED.properties,
       updated_at   = NOW()
     RETURNING *`,
    [
      item.item_id,
      item.display_name,
      item.category,
      JSON.stringify(item.properties ?? {}),
    ]
  );
  return rows[0];
}

export async function deleteItem(itemId: string): Promise<boolean> {
  const pool = getContentPool();
  if (!pool) throw new Error('Postgres unavailable');
  const { rowCount } = await pool.query(
    'DELETE FROM items WHERE item_id = $1',
    [itemId]
  );
  return (rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

export async function listBuildings(category?: string): Promise<BuildingRow[] | null> {
  const pool = getContentPool();
  if (!pool) return null;
  if (category !== undefined) {
    const { rows } = await pool.query<BuildingRow>(
      'SELECT * FROM buildings WHERE category = $1 ORDER BY name ASC',
      [category]
    );
    return rows;
  }
  const { rows } = await pool.query<BuildingRow>(
    'SELECT * FROM buildings ORDER BY category ASC NULLS LAST, name ASC'
  );
  return rows;
}

export async function upsertBuilding(building: UpsertBuildingInput): Promise<BuildingRow> {
  const pool = getContentPool();
  if (!pool) throw new Error('Postgres unavailable');
  const { rows } = await pool.query<BuildingRow>(
    `INSERT INTO buildings (building_id, name, category, properties)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (building_id) DO UPDATE SET
       name       = EXCLUDED.name,
       category   = EXCLUDED.category,
       properties = EXCLUDED.properties,
       updated_at = NOW()
     RETURNING *`,
    [
      building.building_id,
      building.name,
      building.category ?? null,
      JSON.stringify(building.properties ?? {}),
    ]
  );
  return rows[0];
}

export async function deleteBuilding(buildingId: string): Promise<boolean> {
  const pool = getContentPool();
  if (!pool) throw new Error('Postgres unavailable');
  const { rowCount } = await pool.query(
    'DELETE FROM buildings WHERE building_id = $1',
    [buildingId]
  );
  return (rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Voice Configs
// ---------------------------------------------------------------------------

export async function listVoiceConfigs(speciesId?: string): Promise<VoiceConfigRow[] | null> {
  const pool = getContentPool();
  if (!pool) return null;
  if (speciesId !== undefined) {
    const { rows } = await pool.query<VoiceConfigRow>(
      'SELECT * FROM voice_configs WHERE species_id = $1 ORDER BY voice_id ASC',
      [speciesId]
    );
    return rows;
  }
  const { rows } = await pool.query<VoiceConfigRow>(
    'SELECT * FROM voice_configs ORDER BY species_id ASC, voice_id ASC'
  );
  return rows;
}

export async function upsertVoiceConfig(config: UpsertVoiceConfigInput): Promise<VoiceConfigRow> {
  const pool = getContentPool();
  if (!pool) throw new Error('Postgres unavailable');
  const { rows } = await pool.query<VoiceConfigRow>(
    `INSERT INTO voice_configs (species_id, voice_id, enabled, metadata)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (species_id, voice_id) DO UPDATE SET
       enabled    = EXCLUDED.enabled,
       metadata   = EXCLUDED.metadata,
       updated_at = NOW()
     RETURNING *`,
    [
      config.species_id,
      config.voice_id,
      config.enabled ?? true,
      config.metadata != null ? JSON.stringify(config.metadata) : null,
    ]
  );
  return rows[0];
}

export async function deleteVoiceConfig(speciesId: string, voiceId: string): Promise<boolean> {
  const pool = getContentPool();
  if (!pool) throw new Error('Postgres unavailable');
  const { rowCount } = await pool.query(
    'DELETE FROM voice_configs WHERE species_id = $1 AND voice_id = $2',
    [speciesId, voiceId]
  );
  return (rowCount ?? 0) > 0;
}
