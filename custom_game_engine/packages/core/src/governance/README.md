# Governance System

Village information infrastructure. Better buildings = better data quality. No buildings = no visibility.

## Overview

Governance buildings provide population, resource, and environmental data to agents and players. Building condition and staffing affect data quality, latency, and accuracy.

**Core Principle**: Information is infrastructure. Without buildings, agents operate reactively. With buildings, they plan proactively.

## Buildings & Data

### Town Hall (Tier 1)
- **Data**: Population count, agent roster, births, deaths
- **Quality**: Condition-based (full/delayed/unavailable)
- **Panel**: Population

### Census Bureau (Tier 2)
- **Data**: Demographics, birth/death rates, replacement rate, extinction risk, projections
- **Requires**: Town Hall
- **Staffing**: 1 census taker (affects accuracy 0.5-0.9, update frequency)
- **Quality**: real_time (staffed) / stale (unstaffed, 24h updates)
- **Panel**: Demographics

### Warehouse (Tier 1)
- **Data**: Stockpiles, production/consumption rates, days remaining, distribution fairness
- **Capacity**: 1000 units per resource type
- **Panel**: Resources

### Weather Station (Tier 1)
- **Data**: Temperature forecasts, extreme weather warnings
- **Panel**: Weather

### Health Clinic (Tier 2)
- **Data**: Population health (healthy/sick/critical), malnutrition, trauma, mortality causes
- **Staffing**: 1 per 20 agents recommended
- **Quality**: full (staffed) / basic (unstaffed)
- **Panel**: Health

### Meeting Hall (Tier 2)
- **Data**: Social networks, relationships, conflicts, morale
- **Panel**: Social

### Watchtower (Tier 1)
- **Data**: Environmental threats, resource crises
- **Staffing**: 1 watchman
- **Panel**: Threats

### Labor Guild (Tier 2)
- **Data**: Labor allocation, skill inventory, bottlenecks
- **Requires**: Town Hall
- **Panel**: Workforce

### Archive (Tier 3)
- **Data**: Historical trends, generational comparisons, predictive modeling
- **Requires**: Census Bureau + Town Hall
- **Staffing**: 1 scholar
- **Panel**: Historical

## Agent Behavior

**Intelligence-Based Usage**: High intelligence agents query buildings frequently; low intelligence agents rarely query.

**Reactive (no buildings)**: Agents respond to immediate needs only (hunger, cold, danger).

**Proactive (with buildings)**: Agents plan ahead using forecasts and trends.

## Data Quality System

**GovernanceDataSystem** (priority 50) updates buildings at midnight via `time:day_changed` event.

**Quality Factors**:
- Building condition (damaged = delayed/inaccurate)
- Staffing (unstaffed = stale data)
- Staff intelligence (higher = better accuracy)

**Event Tracking**: Listens to `agent:starved`, `agent:collapsed` for death logs. Maintains last 100 deaths/births.

## Error Handling

Per CLAUDE.md: No silent fallbacks. Throws on:
- Missing required components (`CT.Identity` with `name`)
- Panel access without buildings
- Invalid warehouse operations (insufficient stock, capacity exceeded)
- Missing event fields (`timestamp`, `reason`)

## Performance

- Event-driven updates (midnight only via `time:day_changed`)
- Early exit if no governance buildings exist
- Single query for all agents, shared across buildings
- Pre-computed demographics, no per-tick calculations

## Files

- **Components**: `TownHallComponent.ts`, `CensusBureauComponent.ts`, `WarehouseComponent.ts`, `WeatherStationComponent.ts`, `HealthClinicComponent.ts`
- **System**: `GovernanceDataSystem.ts` (updates all buildings)
- **Blueprints**: `GovernanceBlueprints.ts` (9 buildings, costs, dependencies)
- **Types**: `GovernanceTypes.ts` (DataQuality, ResourceStatus, etc.)
