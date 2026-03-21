/**
 * ChorusWeatherEffectSystem — terrain/sky/weather anomaly effects for Blooming and Chorus states.
 *
 * Reads getChorusState() each throttle interval and applies two categories of effects:
 *
 * 1. **Visual atmosphere** — emits `chorus:atmosphere_changed` when effect intensities
 *    change meaningfully. Renderers subscribe to overlay:
 *      - aurora shimmer (Blooming → Chorus)
 *      - sky color tints (Blooming → Chorus)
 *      - particle sparkles (Chorus only)
 *      - terrain surface glow (Blooming → Chorus)
 *
 * 2. **Weather biasing** — nudges clear-sky weather entities toward fog (Blooming) or
 *    storm (Chorus), producing unusual cloud patterns and dramatic sky changes.
 *    Only 'clear' weather is overridden; existing fog/rain/snow/storm is left intact.
 *    Natural weather transitions via WeatherSystem resume once E_f drops.
 *
 * Effect intensities scale continuously within each band:
 *   Blooming (0.6–0.8): t = (e_f − 0.6) / 0.2 → aurora [0, 0.4], colorShift [0, 0.3]
 *   Chorus   (0.8–1.0): t = (e_f − 0.8) / 0.2 → aurora [0.4, 1.0], colorShift [0.3, 1.0]
 *
 * No permanent world changes — all effects stop naturally when E_f drops back below 0.6.
 *
 * Priority 46 — just after ChorusStateSystem (45), before agent systems (50+).
 * Throttled at 100 ticks (~5 seconds at 20 TPS).
 *
 * MUL-2639
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { getChorusState, type ChorusStateBand } from './ChorusStateSystem.js';
import type { WeatherComponent, WeatherType } from '../components/WeatherComponent.js';

// ============================================================================
// Constants
// ============================================================================

const BLOOMING_LOWER = 0.6;
const BLOOMING_UPPER = 0.8;
const CHORUS_LOWER = 0.8;

/**
 * Minimum change in any effect intensity before emitting a new atmosphere event.
 * Prevents event churn when E_f is slowly drifting.
 */
const MIN_EFFECT_DELTA = 0.03;

/**
 * Duration (seconds) of chorus-biased weather overrides.
 * Short enough that WeatherSystem can naturally reclaim control via its own
 * transition logic between our updates, adding variety.
 */
const WEATHER_BIAS_DURATION = 120;

// ============================================================================
// Atmosphere effect computation
// ============================================================================

interface AtmosphereEffect {
  auroraIntensity: number;
  colorShiftIntensity: number;
  particleIntensity: number;
  terrainGlowIntensity: number;
}

const ZERO_EFFECT: AtmosphereEffect = {
  auroraIntensity: 0,
  colorShiftIntensity: 0,
  particleIntensity: 0,
  terrainGlowIntensity: 0,
};

function computeAtmosphereEffect(e_f: number, band: ChorusStateBand): AtmosphereEffect {
  switch (band) {
    case 'blooming': {
      const t = (e_f - BLOOMING_LOWER) / (BLOOMING_UPPER - BLOOMING_LOWER); // [0, 1]
      return {
        auroraIntensity: t * 0.4,
        colorShiftIntensity: t * 0.3,
        particleIntensity: 0,
        terrainGlowIntensity: t * 0.2,
      };
    }
    case 'chorus': {
      const t = Math.min(1, (e_f - CHORUS_LOWER) / (1 - CHORUS_LOWER)); // [0, 1]
      return {
        auroraIntensity: 0.4 + t * 0.6,
        colorShiftIntensity: 0.3 + t * 0.7,
        particleIntensity: t,
        terrainGlowIntensity: 0.2 + t * 0.8,
      };
    }
    default:
      return ZERO_EFFECT;
  }
}

function hasEffectChanged(prev: AtmosphereEffect, next: AtmosphereEffect): boolean {
  return (
    Math.abs(next.auroraIntensity - prev.auroraIntensity) > MIN_EFFECT_DELTA ||
    Math.abs(next.colorShiftIntensity - prev.colorShiftIntensity) > MIN_EFFECT_DELTA ||
    Math.abs(next.particleIntensity - prev.particleIntensity) > MIN_EFFECT_DELTA ||
    Math.abs(next.terrainGlowIntensity - prev.terrainGlowIntensity) > MIN_EFFECT_DELTA
  );
}

// ============================================================================
// System
// ============================================================================

export class ChorusWeatherEffectSystem extends BaseSystem {
  public readonly id = 'chorus_weather_effect' as const;
  public readonly priority = 46;
  public readonly requiredComponents = [] as const;
  // No activationComponents — self-guards via getChorusState(), cheap when inactive.
  protected readonly throttleInterval = 100; // ~5 seconds at 20 TPS

  private lastEffect: AtmosphereEffect = { ...ZERO_EFFECT };

  protected onUpdate(ctx: SystemContext): void {
    const state = getChorusState();
    const { e_f, band } = state;

    // --- 1. Visual atmosphere events ---
    const nextEffect = computeAtmosphereEffect(e_f, band);

    if (hasEffectChanged(this.lastEffect, nextEffect)) {
      ctx.emit('chorus:atmosphere_changed', {
        e_f,
        band,
        auroraIntensity: nextEffect.auroraIntensity,
        colorShiftIntensity: nextEffect.colorShiftIntensity,
        particleIntensity: nextEffect.particleIntensity,
        terrainGlowIntensity: nextEffect.terrainGlowIntensity,
      });
      this.lastEffect = nextEffect;
    }

    // --- 2. Weather biasing ---
    if (band === 'blooming' || band === 'chorus') {
      this.applyWeatherBias(ctx, e_f, band);
    }
  }

  /**
   * Nudge clear-sky weather entities toward anomalous types while Chorus state is active.
   *
   * Blooming → fog  (unusual cloud/mist patterns, color diffusion)
   * Chorus   → storm (dramatic sky, lightning potential)
   *
   * Only 'clear' weather is overridden so existing precipitation is preserved.
   * Intensity scales continuously with E_f within each band.
   */
  private applyWeatherBias(ctx: SystemContext, e_f: number, band: ChorusStateBand): void {
    const weatherEntities = ctx.world.query().with(CT.Weather).executeEntities();
    if (weatherEntities.length === 0) return;

    const targetType: WeatherType = band === 'chorus' ? 'storm' : 'fog';
    const targetIntensity =
      band === 'chorus'
        ? 0.5 + Math.min(1, (e_f - CHORUS_LOWER) / (1 - CHORUS_LOWER)) * 0.5
        : ((e_f - BLOOMING_LOWER) / (BLOOMING_UPPER - BLOOMING_LOWER)) * 0.6;

    for (const entity of weatherEntities) {
      const weather = entity.getComponent(CT.Weather) as WeatherComponent | null | undefined;
      if (!weather) continue;

      // Only override clear skies — leave existing precipitation intact.
      if (weather.weatherType !== 'clear') continue;

      ctx.world.updateComponent(entity.id, CT.Weather, (current: WeatherComponent) => ({
        ...current,
        weatherType: targetType,
        intensity: targetIntensity,
        // Short duration: WeatherSystem may naturally reclaim the slot between our
        // updates, adding organic variety to the anomalous weather pattern.
        duration: WEATHER_BIAS_DURATION,
      }));

      ctx.emit(
        'weather:changed',
        {
          weatherType: targetType,
          intensity: targetIntensity,
          causedBy: `chorus:${band}`,
          divine: false,
        },
        entity.id,
      );
    }
  }
}
