# Package Extraction Plan - 2026-01-06

## Objective
Extract loosely-coupled systems from `@ai-village/core` into standalone packages to improve modularity, reusability, and maintainability.

## Phase 1: P0 Extractions (This Session)

### 1. @ai-village/environment
**Systems to extract:**
- TimeSystem
- WeatherSystem
- TemperatureSystem
- SoilSystem
- ClimateSystem

**Components to move:**
- time
- weather
- temperature
- soil
- climate (if exists)

**Dependencies:** None (foundation layer)

**Steps:**
1. Create `packages/environment/` directory structure
2. Create package.json with @ai-village/core as peer dependency
3. Move system files from core/src/systems/
4. Move related component definitions
5. Create index.ts with exports
6. Update core's registerAllSystems.ts to import from new package
7. Update core's package.json dependencies
8. Build and test

---

### 2. @ai-village/navigation
**Systems to extract:**
- MovementSystem
- SteeringSystem
- ExplorationSystem

**Components to move:**
- velocity
- steering
- exploration
- path (if exists)

**Dependencies:** Position component (stays in core)

**Steps:**
1. Create `packages/navigation/` directory structure
2. Create package.json
3. Move system files
4. Move related component definitions
5. Create index.ts
6. Update imports in core
7. Build and test

---

### 3. @ai-village/botany
**Systems to extract:**
- PlantSystem
- PlantDiscoverySystem
- PlantDiseaseSystem
- WildPlantPopulationSystem

**Components to move:**
- plant
- plant_disease
- growth_stage
- harvestable

**Dependencies:** @ai-village/environment

**Steps:**
1. Create `packages/botany/` directory structure
2. Create package.json with environment as dependency
3. Move system files
4. Move related component definitions
5. Create index.ts
6. Update imports in core
7. Build and test

---

## Phase 2: P1 Extractions (Next Session)

### 4. @ai-village/fauna
- AnimalSystem, AnimalBrainSystem, AnimalProductionSystem, etc.

### 5. @ai-village/cognition
- MemorySystem, MemoryFormationSystem, BeliefFormationSystem, etc.

---

## Phase 3: P2 Extractions (Future)

### 6. @ai-village/construction
### 7. @ai-village/economy
### 8. @ai-village/automation
### 9. @ai-village/research

---

## Extraction Checklist (Per Package)

- [ ] Create package directory structure
- [ ] Create package.json with correct dependencies
- [ ] Create tsconfig.json extending root config
- [ ] Move system files
- [ ] Move component type definitions
- [ ] Create src/index.ts with all exports
- [ ] Update core's registerAllSystems.ts
- [ ] Update core's ComponentTypes.ts if needed
- [ ] Add package to workspace in root package.json
- [ ] Run `npm install` to link packages
- [ ] Run `npm run build` to verify compilation
- [ ] Run game to verify runtime behavior
- [ ] Update SYSTEMS_CATALOG.md with new locations

---

## Current Progress

- [ ] **@ai-village/environment** - Not started
- [ ] **@ai-village/navigation** - Not started
- [ ] **@ai-village/botany** - Not started

---

## Notes

- Keep backward compatibility by re-exporting from core initially
- Systems maintain same priorities and execution order
- Components keep same type names (lowercase_with_underscores)
