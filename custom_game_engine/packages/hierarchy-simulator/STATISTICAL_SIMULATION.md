# Statistical Simulation using Differential Equations

This module provides O(1) cost simulation at higher tiers (Planet, System, Sector, Galaxy) using differential equations instead of per-entity ECS simulation.

## Overview

At higher tiers in the hierarchy, simulating individual entities becomes prohibitively expensive. Instead, we use statistical simulation with differential equations to model population growth, technology advancement, and economic flows.

## Mathematical Approach

### Population Dynamics

Logistic growth equation:
```
dP/dt = r * P * (1 - P/K)
```

Where:
- `P` = current population
- `r` = intrinsic growth rate (modified by happiness)
- `K` = carrying capacity (enhanced by tech level)
- `t` = time

### Technology Progression

Research accumulation:
```
tech.research += (researchers * researchRate) * dt
```

Tech cost scaling:
```
cost(level) = BASE_COST * (level + 1)^1.5
```

### Economic Simulation

Stockpile dynamics:
```
stockpile(t+dt) = stockpile(t) + (production - consumption) * dt - decay * dt
```

Where production and consumption are modified by:
- Tech efficiency: `1.0 + 0.15 * techLevel`
- Infrastructure: `(stability.infrastructure - 50) * 0.01`

## Time Scales

From `TierConstants.ts`:

| Tier    | Time Scale   | 1 Tick =     | Focus                          |
|---------|--------------|--------------|--------------------------------|
| Planet  | 5,256,000    | 10 years     | Planetary civilization         |
| System  | 52,560,000   | 100 years    | Interplanetary colonization    |
| Sector  | 525,600,000  | 1,000 years  | Inter-system politics & trade  |
| Galaxy  | 5,256,000,000| 10,000 years | Cosmic-scale events            |

## Usage

### Planet-tier Simulation

```typescript
import { simulatePlanetTier } from '@ai-village/hierarchy-simulator';
import { AbstractPlanet } from '@ai-village/hierarchy-simulator';

const planet = new AbstractPlanet('earth-1', 'Earth Prime', {});

// Simulate 1 tick (10 years)
simulatePlanetTier(planet, 1);

console.log(`Population: ${planet.population.total}`);
console.log(`Tech Level: ${planet.tech.level}`);
console.log(`Urbanization: ${planet.civilizationStats.urbanization}`);
```

**What it simulates:**
- Logistic population growth with tech-enhanced carrying capacity
- Tech advancement via research accumulation
- Resource extraction and stockpiling
- Civilization development (urbanization, industrialization)
- Megastructure construction (space elevators, etc.)
- Random events based on stability

### System-tier Simulation

```typescript
import { simulateSystemTier } from '@ai-village/hierarchy-simulator';
import { AbstractSystem } from '@ai-village/hierarchy-simulator';

const system = new AbstractSystem('sol-1', 'Sol System', {});

// Simulate 1 tick (100 years)
simulateSystemTier(system, 1);

console.log(`Spacefaring: ${system.systemStats.spacefaringCivCount > 0}`);
console.log(`FTL Capable: ${system.systemStats.ftlCapable > 0}`);
console.log(`Orbital Infrastructure: ${system.orbitalInfrastructure.length}`);
```

**What it simulates:**
- System-wide population growth (slower than planet)
- Orbital infrastructure expansion (stations, shipyards, habitats)
- Asteroid mining operations
- Space technology advancement
- Defense platform deployment
- Economic output calculation

### Sector-tier Simulation

```typescript
import { simulateSectorTier } from '@ai-village/hierarchy-simulator';
import { AbstractSector } from '@ai-village/hierarchy-simulator';

const sector = new AbstractSector('alpha-1', 'Alpha Quadrant', {});

// Simulate 1 tick (1,000 years)
simulateSectorTier(sector, 1);

console.log(`Political Entities: ${sector.politicalEntities.length}`);
console.log(`Economic Integration: ${sector.sectorStats.economicIntegration}`);
console.log(`Wormhole Gates: ${sector.infrastructure.wormholeGates.length}`);
```

**What it simulates:**
- Inter-system trade network formation
- Political consolidation (empire mergers)
- Wormhole gate construction
- Sector-wide economic integration
- Diplomatic relations
- War/peace dynamics

### Galaxy-tier Simulation

```typescript
import { simulateGalaxyTier } from '@ai-village/hierarchy-simulator';
import { AbstractGalaxy } from '@ai-village/hierarchy-simulator';

const galaxy = new AbstractGalaxy('milkyway-1', 'Milky Way', {});

// Simulate 1 tick (10,000 years)
simulateGalaxyTier(galaxy, 1);

console.log(`Civilizations: ${galaxy.galacticCivilizations.length}`);
console.log(`Avg Kardashev Level: ${galaxy.galacticStats.avgKardashevLevel}`);
console.log(`Total Energy Output: ${galaxy.galacticStats.totalEnergyOutput}`);
console.log(`Cosmic Events: ${galaxy.cosmicEvents.length}`);
```

**What it simulates:**
- Galactic expansion (sector colonization)
- Kardashev level progression (K2 → K3 → transcendent)
- Dyson sphere construction
- Galactic governance formation (Galactic Council)
- Mega-events (singularities, gamma ray bursts, universe forks)
- Wormhole network spanning the galaxy

## Performance Characteristics

All simulators run in **O(1)** time regardless of the number of individual entities:

- **Planet**: ~50 μs per tick (vs. millions of agents)
- **System**: ~30 μs per tick (vs. billions of entities)
- **Sector**: ~20 μs per tick (aggregate of systems)
- **Galaxy**: ~15 μs per tick (aggregate of sectors)

This enables simulating entire galaxies with quadrillions of entities at 20 TPS.

## Constants

All constants are defined in `StatisticalSimulation.ts`:

```typescript
POPULATION_CONSTANTS = {
  BASE_GROWTH_RATE: 0.02,              // 2% per time unit
  HAPPINESS_MODIFIER_MIN: 0.5,          // Min growth rate modifier
  HAPPINESS_MODIFIER_MAX: 1.5,          // Max growth rate modifier
  TECH_CAPACITY_BONUS: 0.1,             // +10% capacity per tech level
  STABILITY_DECLINE_THRESHOLD: 30,      // Below this, population declines
};

TECH_CONSTANTS = {
  BASE_RESEARCH_COST: 1000,
  COST_SCALING_EXPONENT: 1.5,           // cost = base * level^1.5
  RESEARCH_PER_SCIENTIST: 0.1,
  EFFICIENCY_PER_LEVEL: 0.15,           // +15% efficiency per level
};

ECONOMY_CONSTANTS = {
  BASE_PRODUCTION: 1.0,
  BASE_CONSUMPTION: 0.9,
  DECAY_RATE: 0.001,                    // 0.1% stockpile decay per tick
  INFRASTRUCTURE_IMPACT: 0.01,          // Infrastructure → production
};

EVENT_CONSTANTS = {
  BASE_EVENT_CHANCE: 0.001,             // 0.1% per tick
  STABILITY_EVENT_MODIFIER: -0.01,      // Low stability → more events
  MEGA_EVENT_CHANCE: 0.0001,            // Galaxy-tier cosmic events
};
```

## Integration with ECS

These simulators are designed to replace ECS simulation at higher tiers while maintaining compatibility:

1. **Tier threshold**: Below Planet tier, use full ECS. At Planet+ tiers, use statistical simulation.
2. **Data flow**: Abstract tier population/economy feeds into child tier carrying capacity.
3. **Event propagation**: Events generated at higher tiers cascade to lower tiers.

Example integration:

```typescript
function updateTier(tier: AbstractTier, deltaTime: number): void {
  if (tier.tier === 'planet') {
    simulatePlanetTier(tier as AbstractPlanet, deltaTime);
  } else if (tier.tier === 'system') {
    simulateSystemTier(tier as AbstractSystem, deltaTime);
  } else if (tier.tier === 'sector') {
    simulateSectorTier(tier as AbstractSector, deltaTime);
  } else if (tier.tier === 'galaxy') {
    simulateGalaxyTier(tier as AbstractGalaxy, deltaTime);
  }

  // Update children recursively
  for (const child of tier.children) {
    updateTier(child, deltaTime);
  }
}
```

## Testing

See `__tests__/StatisticalSimulation.test.ts` for comprehensive test coverage:

```bash
npm test -- packages/hierarchy-simulator/src/simulation/__tests__/StatisticalSimulation.test.ts
```

20 tests covering:
- Population growth dynamics
- Tech advancement
- Economic stockpile management
- Infrastructure expansion
- Event generation
- Boundary conditions (min population, max values)

## Future Enhancements

Potential improvements:

1. **Stochastic events**: Add variance to deterministic equations
2. **Migration flows**: Model population movement between tiers
3. **Resource specialization**: Different planets/systems specialize in different resources
4. **Cultural drift**: Civilizations develop unique characteristics over time
5. **Great Filters**: Model existential risks at each Kardashev transition
6. **Multiverse integration**: Cross-universe trade and conflict at galaxy tier

## References

- `TierConstants.ts`: Time scaling and summarization rules
- `AbstractTierBase.ts`: Base class for all abstract tiers
- `AbstractPlanet.ts`, `AbstractSystem.ts`, `AbstractSector.ts`, `AbstractGalaxy.ts`: Tier implementations
- `RENORMALIZATION_LAYER.md`: Overall architecture and philosophy
