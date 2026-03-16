# Seasonal Climate System — Science Design Spec

**Author:** Hard Sci-Fi Consultant
**Filed:** 2026-03-16
**Status:** Draft — awaiting PM prioritization
**Related:** WeatherSystem (`packages/core/src/systems/WeatherSystem.ts`), TemperatureSystem (`packages/environment/src/systems/TemperatureSystem.ts`), TimeSystem (`packages/core/src/systems/TimeSystem.ts`), BIOME_TRANSITIONS.md

---

## Problem Statement

The `WeatherSystem` currently selects weather via a **weighted random draw with no inputs** — the same weights apply regardless of biome, season, or geography. A tundra in winter gets the same snow probability as a jungle in summer. This breaks immersion and teaches players nothing about real atmospheric science.

The `TemperatureSystem` has excellent daily temperature cycles (`BASE_TEMP + DAILY_VARIATION * sin(...)`) but **ignores the `season` field** already computed by `TimeSystem`. Seasons are tracked in the data model but unused by any physics system.

**Science principle at stake:** Earth's climate variability is primarily driven by:
1. **Latitude/biome** — position on the Hadley cell circulation determines moisture and base temperature
2. **Season** — axial tilt causes insolation variation (Milanković 1941; the same orbital mechanics that apply to any terrestrial planet)
3. **Feedback loops** — surface albedo, moisture, heat capacity of water vs. land

All three are already representable in MVEE's data model. This spec defines how to wire them together.

---

## Design Philosophy

**Plausible, not pedantic.** The goal is not a GCM (General Circulation Model). It's a system where:
- Players learn that deserts are dry because of Hadley cell subsidence, not as a fact but as a *felt experience*
- Seasonal farming cycles feel grounded ("plant before the monsoon")
- Weather creates emergent narrative ("the endless summer drought broke when the traders arrived from the north")

**Scale matters.** The existing 360-day year / 90-day seasons already model axial tilt effects on insolation. We just need to propagate that into weather and temperature.

---

## Science Grounding

### Hadley Cell → Biome Moisture

The Earth's major climate zones follow a simple pattern driven by the atmospheric Hadley, Ferrel, and Polar cells:

| Latitude Band | Circulation | Moisture | Real biomes |
|---------------|-------------|----------|-------------|
| Equatorial (0°–15°) | ITCZ convergence, rising air | Very wet | jungle, wetland |
| Subtropical (15°–35°) | Hadley subsidence, sinking air | Very dry | desert, scrubland |
| Temperate (35°–60°) | Ferrel cell, westerlies | Variable | forest, woodland, plains |
| Polar (60°–90°) | Polar cell, subsidence | Dry + cold | tundra, taiga, glacier |

In MVEE, **biome type is already a proxy for this**. A tile's biome encodes the moisture and temperature history that would determine its Hadley-cell position. We don't need latitude coordinates — we can read climate character from biome directly.

### Seasonal Insolation

Axial tilt (~23.5° for Earth, varying for alien worlds) drives seasonal temperature swings proportional to:

```
T_seasonal(season) = T_base + amplitude × cos(2π × dayOfYear / 360)
```

where `amplitude` varies by latitude (larger swings at high latitudes — temperate/polar biomes; smaller at equatorial). This is already the structure of the `TemperatureSystem`'s daily cycle; we just need to add the seasonal envelope.

**Key values (Earth-analog):**
- Jungle/desert (equatorial): ±3°C seasonal swing
- Plains/forest/savanna (temperate): ±12°C seasonal swing
- Tundra/taiga (polar): ±20°C seasonal swing

### Monsoon Dynamics

Monsoons arise from differential heating between land and ocean. In summer, land heats faster than ocean → low pressure over land → moist air flows inland → rainfall. This is why savannas have a pronounced dry/wet season rather than year-round rain.

In MVEE terms: biomes adjacent to ocean (or with high base moisture) should show stronger seasonal rainfall variation — very dry in one season, very wet in another.

---

## Proposed Implementation

### Part 1: Biome Weather Weights (WeatherSystem)

Replace the flat `weights` object in `WeatherSystem.selectNewWeatherType()` with a biome × season lookup table.

**Data structure:**

```typescript
type WeatherWeights = Record<WeatherType, number>;

const BIOME_SEASON_WEATHER_WEIGHTS:
  Partial<Record<BiomeType, Record<Season, WeatherWeights>>> = {

  // --- Equatorial biomes: hot, wet year-round ---
  'jungle': {
    spring: { clear: 10, rain: 55, storm: 25, snow: 0,  fog: 10 },
    summer: { clear: 15, rain: 45, storm: 30, snow: 0,  fog: 10 },
    fall:   { clear: 10, rain: 55, storm: 25, snow: 0,  fog: 10 },
    winter: { clear: 20, rain: 50, storm: 20, snow: 0,  fog: 10 },
  },
  'wetland': {
    spring: { clear: 15, rain: 50, storm: 20, snow: 0,  fog: 15 },
    summer: { clear: 25, rain: 45, storm: 20, snow: 0,  fog: 10 },
    fall:   { clear: 15, rain: 50, storm: 20, snow: 0,  fog: 15 },
    winter: { clear: 20, rain: 45, storm: 15, snow: 0,  fog: 20 },
  },

  // --- Subtropical biomes: hot and dry, small seasonal variation ---
  'desert': {
    spring: { clear: 80, rain: 10, storm: 5,  snow: 0,  fog: 5  },
    summer: { clear: 85, rain: 5,  storm: 5,  snow: 0,  fog: 5  },
    fall:   { clear: 80, rain: 10, storm: 5,  snow: 0,  fog: 5  },
    winter: { clear: 75, rain: 15, storm: 5,  snow: 0,  fog: 5  },
  },
  'scrubland': {
    spring: { clear: 55, rain: 25, storm: 10, snow: 0,  fog: 10 },
    summer: { clear: 65, rain: 15, storm: 10, snow: 0,  fog: 10 },
    fall:   { clear: 55, rain: 25, storm: 10, snow: 0,  fog: 10 },
    winter: { clear: 50, rain: 30, storm: 8,  snow: 2,  fog: 10 },
  },

  // --- Savanna: dramatic dry/wet seasons (monsoon character) ---
  'savanna': {
    spring: { clear: 30, rain: 45, storm: 15, snow: 0,  fog: 10 }, // Wet season onset
    summer: { clear: 20, rain: 50, storm: 20, snow: 0,  fog: 10 }, // Peak wet
    fall:   { clear: 45, rain: 30, storm: 10, snow: 0,  fog: 15 }, // Dry season onset
    winter: { clear: 70, rain: 15, storm: 5,  snow: 0,  fog: 10 }, // Peak dry
  },

  // --- Temperate biomes: four distinct seasons ---
  'plains': {
    spring: { clear: 35, rain: 35, storm: 15, snow: 5,  fog: 10 },
    summer: { clear: 45, rain: 30, storm: 15, snow: 0,  fog: 10 },
    fall:   { clear: 35, rain: 30, storm: 10, snow: 10, fog: 15 },
    winter: { clear: 30, rain: 15, storm: 10, snow: 35, fog: 10 },
  },
  'forest': {
    spring: { clear: 30, rain: 40, storm: 10, snow: 5,  fog: 15 },
    summer: { clear: 40, rain: 35, storm: 10, snow: 0,  fog: 15 },
    fall:   { clear: 30, rain: 30, storm: 10, snow: 10, fog: 20 },
    winter: { clear: 25, rain: 20, storm: 10, snow: 30, fog: 15 },
  },
  'woodland': {
    spring: { clear: 35, rain: 35, storm: 10, snow: 5,  fog: 15 },
    summer: { clear: 45, rain: 30, storm: 10, snow: 0,  fog: 15 },
    fall:   { clear: 30, rain: 30, storm: 10, snow: 15, fog: 15 },
    winter: { clear: 25, rain: 20, storm: 10, snow: 30, fog: 15 },
  },
  'foothills': {
    spring: { clear: 30, rain: 35, storm: 15, snow: 10, fog: 10 },
    summer: { clear: 40, rain: 30, storm: 15, snow: 0,  fog: 15 },
    fall:   { clear: 30, rain: 25, storm: 10, snow: 20, fog: 15 },
    winter: { clear: 25, rain: 15, storm: 10, snow: 40, fog: 10 },
  },
  'mountains': {
    spring: { clear: 25, rain: 20, storm: 20, snow: 25, fog: 10 },
    summer: { clear: 35, rain: 25, storm: 20, snow: 5,  fog: 15 },
    fall:   { clear: 25, rain: 15, storm: 15, snow: 35, fog: 10 },
    winter: { clear: 20, rain: 10, storm: 15, snow: 50, fog: 5  },
  },

  // --- Polar/boreal biomes: cold, dry, mostly snow ---
  'taiga': {
    spring: { clear: 30, rain: 20, storm: 10, snow: 30, fog: 10 },
    summer: { clear: 45, rain: 30, storm: 10, snow: 5,  fog: 10 },
    fall:   { clear: 25, rain: 15, storm: 10, snow: 40, fog: 10 },
    winter: { clear: 25, rain: 5,  storm: 10, snow: 55, fog: 5  },
  },
  'tundra': {
    spring: { clear: 35, rain: 15, storm: 10, snow: 35, fog: 5  },
    summer: { clear: 50, rain: 25, storm: 10, snow: 5,  fog: 10 },
    fall:   { clear: 25, rain: 10, storm: 10, snow: 50, fog: 5  },
    winter: { clear: 25, rain: 2,  storm: 8,  snow: 62, fog: 3  },
  },
  'glacier': {
    spring: { clear: 30, rain: 5,  storm: 10, snow: 50, fog: 5  },
    summer: { clear: 40, rain: 10, storm: 10, snow: 35, fog: 5  },
    fall:   { clear: 25, rain: 5,  storm: 10, snow: 55, fog: 5  },
    winter: { clear: 20, rain: 0,  storm: 10, snow: 65, fog: 5  },
  },
};

// Default for biomes not explicitly listed (temperate character)
const DEFAULT_WEATHER_WEIGHTS: Record<Season, WeatherWeights> = {
  spring: { clear: 35, rain: 35, storm: 10, snow: 5,  fog: 15 },
  summer: { clear: 50, rain: 30, storm: 10, snow: 0,  fog: 10 },
  fall:   { clear: 35, rain: 25, storm: 10, snow: 15, fog: 15 },
  winter: { clear: 30, rain: 15, storm: 10, snow: 35, fog: 10 },
};
```

**Integration point:** `WeatherSystem.selectNewWeatherType()` needs to:
1. Query the world's biome (from the biome entity or a world-level config component)
2. Query the current season from the `TimeComponent` singleton
3. Use the appropriate weights table row

**Biome resolution:** The biome can be read from the world's `WorldConfigComponent` or by sampling the tile at the weather entity's position. For a single-weather-per-world system (current architecture), use the world's "primary biome" (the most common biome, or one set at world creation).

### Part 2: Seasonal Temperature Envelope (TemperatureSystem)

Add a seasonal temperature offset to `calculateWorldTemperature()`:

```typescript
/**
 * Seasonal temperature amplitude by biome climate character.
 * Values in °C — peak summer/winter deviation from annual mean.
 *
 * Scientific basis: IPCC AR6 (2021) Table 11.1 gives observed seasonal
 * temperature ranges by climate zone. These are approximations for gameplay.
 */
const BIOME_SEASONAL_AMPLITUDE: Partial<Record<BiomeType, number>> = {
  // Equatorial: low seasonal variation (consistent insolation angle)
  'jungle': 3,
  'wetland': 4,
  // Subtropical: moderate variation
  'desert': 8,
  'scrubland': 8,
  'savanna': 6,
  // Temperate: strong four-season cycle
  'plains': 12,
  'forest': 12,
  'woodland': 11,
  'foothills': 14,
  'mountains': 16,
  // Polar/boreal: extreme seasonal swings
  'taiga': 20,
  'tundra': 22,
  'glacier': 25,
};
const DEFAULT_SEASONAL_AMPLITUDE = 12; // Temperate default

/**
 * Season → phase offset for cosine curve.
 * Peak temperature is summer (phase 0), trough is winter (phase π).
 */
const SEASON_PHASE: Record<Season, number> = {
  summer: 1.0,   // Peak
  spring: 0.0,   // Zero crossing (warming)
  fall:  -0.0,   // Zero crossing (cooling) — approximately same magnitude
  winter: -1.0,  // Trough
};
// More precisely, use a continuous cosine on dayOfYear:
// seasonalOffset = amplitude × cos(2π × dayOfYear / 360)
// This gives smooth transitions instead of step changes between seasons.
```

**Updated `calculateWorldTemperature()`:**

```typescript
private calculateWorldTemperature(world: World): number {
  // --- Daily cycle (existing) ---
  const timeOfDay = this.getTimeOfDay(world);
  const timeRadians = ((timeOfDay - 6) / 24) * Math.PI * 2;
  const dailyVariation = this.DAILY_VARIATION * Math.sin(timeRadians);

  // --- Seasonal cycle (NEW) ---
  const dayOfYear = this.getDayOfYear(world);  // from TimeComponent.day % 360
  const amplitude = this.getSeasonalAmplitude(world); // from biome config
  const seasonalOffset = amplitude * Math.cos((2 * Math.PI * dayOfYear) / 360);
  // Note: cos(0) = 1 at day 1 (winter in northern hemisphere convention),
  //       cos(π) = -1 at day 180 (summer). Flip sign for summer-peak:
  const seasonalVariation = -seasonalOffset; // Summer (day 180) = peak warmth

  return this.BASE_TEMP + dailyVariation + seasonalVariation;
}
```

This gives a smooth, physically-correct superposition of daily and annual temperature cycles — the same mathematical structure as real meteorological models.

### Part 3: Weather Temperature Modifiers by Season

The existing `WeatherComponent.tempModifier` should vary by season and biome. Currently it's a static value set when the weather is created. Replace with:

```typescript
const WEATHER_TEMP_MODIFIERS: Record<WeatherType, Record<Season, number>> = {
  clear:  { spring: +1, summer: +2,  fall:  0,   winter: -1 }, // Clear = more solar insolation
  rain:   { spring: -1, summer: -2,  fall: -2,   winter: -1 }, // Rain = evaporative cooling
  storm:  { spring: -2, summer: -3,  fall: -3,   winter: -2 }, // Storms = strong cooling
  snow:   { spring: -3, summer: -4,  fall: -4,   winter: -5 }, // Snow = albedo feedback (high albedo → cooling)
  fog:    { spring: -1, summer: -1,  fall: -2,   winter: -1 }, // Fog = mild cooling
};
```

The snow modifier includes the **albedo feedback** effect: fresh snow has albedo ~0.8 (reflects 80% of solar radiation), strongly suppressing daytime warming. This is scientifically important — it's a major mechanism of ice age onset and why polar regions cool faster.

---

## Implementation Plan

**Phase 1 (Low effort, high science value):**
- Add `seasonalAmplitude` to world config or derive from biome
- Update `TemperatureSystem.calculateWorldTemperature()` to use season from `TimeComponent`
- TemperatureSystem already imports `TimeComponent` — this is a 10-line change

**Phase 2 (Medium effort):**
- Add `BIOME_SEASON_WEATHER_WEIGHTS` table to WeatherSystem
- Read biome from world config or primary tile biome
- Read season from TimeComponent singleton
- Update `selectNewWeatherType()` to use table lookup

**Phase 3 (Science flavor, low effort):**
- Update `WEATHER_TEMP_MODIFIERS` to be season-aware
- Add albedo comment to snow modifier for developer education

**Rollback safety:** Both systems are isolated (no other system reads their internal weights). Changes are additive — existing behavior is preserved as the `DEFAULT` row.

---

## Emergent Gameplay Unlocked

Once implemented, players naturally learn:

1. **Don't plant wheat in the tundra winter** — snow weather + cold seasonal base = crop failure
2. **Savanna is for monsoon farming** — wet season rain → good harvest, dry season → irrigation required
3. **Mountain passes close in winter** — storm + snow weather + seasonal cold = travel hazard
4. **Jungle is reliably warm but you can't predict rain** — high rain probability regardless of season

These are *real* climate science lessons, taught through gameplay consequences, not text.

---

## Science References

- Milanković, M. (1941). *Canon of Insolation and the Ice Age Problem.* — Orbital mechanics driving seasonal insolation.
- Trenberth, K.E. et al. (2009). Earth's global energy budget. *BAMS.* — Hadley cell moisture redistribution.
- IPCC AR6 (2021). Chapter 11: Weather and Climate Extreme Events. Table 11.1 — Seasonal temperature amplitude by climate zone.
- Budyko, M.I. (1969). The effect of solar radiation variations on the climate of the Earth. *Tellus.* — Albedo feedback mechanism.

---

## Notes for Implementer

- The `WeatherSystem` currently has `private readonly WEATHER_TRANSITION_CHANCE = 0.01` — this global rate is fine to keep. The biome/season weights only affect *which* type is chosen, not *when* transitions happen.
- `TimeComponent.day` is the source for `dayOfYear = ((day - 1) % 360) + 1`. `TimeComponent.season` is a convenience field but using `day` directly gives a smooth cosine rather than a stepped season.
- Do not add `console.log` debug output. Existing warning/error patterns are fine.
- Run `npm test` and `npm run build` before marking implementation complete.
