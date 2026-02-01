# Persistence Layer Data Loss Audit - February 1, 2026

## Executive Summary

Systematic audit of the persistence layer reveals **multiple critical data loss vulnerabilities** due to silent initialization of empty structures. These violations of the "No Silent Fallbacks" rule (CLAUDE.md) can cause permanent data loss without any error indication.

**Severity**: HIGH - Production data loss possible
**Scope**: 15+ locations across SaveLoadService, WorldSerializer, and component serializers
**Impact**: Lost player progress, corrupted saves, undetectable data corruption

---

## Findings by Severity

### CRITICAL: Save File Top-Level Data Loss

#### 1. God-Crafted Queue Silent Loss
**Location**: `SaveLoadService.ts:407-409`, `SaveLoadService.ts:595-597`

**Issue**: The god-crafted queue (microgenerator content) is only restored if it exists. Missing/null/undefined data is silently ignored.

```typescript
// CURRENT (BROKEN):
if (saveFile.godCraftedQueue) {
  godCraftedQueue.deserialize(saveFile.godCraftedQueue as { version: number; entries: QueueEntry[] });
}
// If missing: queue is NOT restored, previous data silently lost
```

**Data Loss Scenario**:
1. Save file has 50 microgenerator entries in queue
2. Corruption/bug causes `godCraftedQueue` field to become `null` or `undefined`
3. Load succeeds without error
4. **50 microgenerator entries permanently lost**

**Type Definition**: `godCraftedQueue?: { version: number; entries: unknown[] }` (optional)
- Type allows missing data, but code should distinguish between "legitimately empty" and "corrupted/missing"

**Fix Required**: Validate presence and throw error if missing when queue is expected to have data.

---

#### 2. Passages Array Silent Skipping
**Location**: `SaveLoadService.ts:417-448`, `SaveLoadService.ts:605-636`

**Issue**: Passages are only restored if the array exists AND has length > 0. Empty arrays or missing data are silently ignored.

```typescript
// CURRENT (BROKEN):
if (saveFile.passages && saveFile.passages.length > 0) {
  for (const passageSnapshot of saveFile.passages) {
    // ... restore passages
  }
}
// If missing: passages silently not restored
```

**Data Loss Scenario**:
1. Save file has 3 universe passages (inter-universe travel)
2. Corruption causes `passages` field to become `null`, `undefined`, or `[]`
3. Load succeeds without error
4. **All passage connections permanently lost**
5. Universes become isolated, time travel broken

**Type Definition**: `passages: PassageSnapshot[]` (REQUIRED, not optional!)
- Type says required, but code treats as optional
- **Type mismatch vulnerability**: Required field checked as if optional

**Fix Required**:
- Validate `passages` is an array (even if empty) and throw if missing
- Empty array is valid (no passages), but missing field is corruption

---

### HIGH: Component Serializer Data Loss

#### 3. SpellKnowledgeComponent Silent Defaults
**Location**: `serializers/SpellKnowledgeSerializer.ts:27-31`

**Issue**: Uses `||` operator to silently default to empty arrays/objects when data is missing.

```typescript
// CURRENT (BROKEN):
comp.knownSpells = (d.knownSpells as Array<...>) || [];
comp.knownParadigmIds = (d.knownParadigmIds as string[]) || [];
comp.activeEffects = (d.activeEffects as string[]) || [];
comp.techniqueProficiency = (d.techniqueProficiency as ...) || {};
comp.formProficiency = (d.formProficiency as ...) || {};
```

**Data Loss Scenario**:
1. Agent knows 10 spells, 3 paradigms, has 5 active effects
2. Corruption causes `knownSpells` to become `null` or `false`
3. `|| []` triggers, silently defaulting to empty array
4. Load succeeds without error
5. **Agent loses all spell knowledge, progress reset to zero**

**Why Broken**: Cannot distinguish between:
- Legitimate empty state: `knownSpells: []` (agent knows no spells)
- Corrupted state: `knownSpells: null` (data was lost)

**Validation Contradiction**: Lines 40-45 validate that arrays exist:
```typescript
if (!Array.isArray(d.knownSpells)) {
  throw new Error('SpellKnowledgeComponent missing required knownSpells array');
}
```

But validation runs BEFORE deserialization, so it never catches the `|| []` fallback.

**Fix Required**: Remove `|| []` fallbacks. If data is missing, let validation throw error.

---

#### 4. EpisodicMemoryComponent Silent Memory Loss
**Location**: `serializers/EpisodicMemorySerializer.ts:35`

**Issue**: Uses `??` to silently default to empty array when memories are missing.

```typescript
// CURRENT (BROKEN):
componentAny._episodicMemories = serialized.memories ?? [];
```

**Data Loss Scenario**:
1. Agent has 100 episodic memories (life experiences)
2. Corruption causes `memories` field to become `null` or `undefined`
3. `?? []` triggers, silently defaulting to empty array
4. Load succeeds without error
5. **Agent loses entire memory history**

**Fix Required**: Validate `memories` array exists and throw if missing.

---

#### 5. JournalComponent Silent Entry Loss
**Location**: `serializers/JournalSerializer.ts:21`, `serializers/JournalSerializer.ts:33`

**Issue**: Uses `??` to silently default to empty array when journal entries are missing.

```typescript
// CURRENT (BROKEN - serialization):
return {
  entries: componentAny._entries ?? [],
};

// CURRENT (BROKEN - deserialization):
componentAny._entries = serialized.entries ?? [];
```

**Data Loss Scenario**:
1. Agent has 50 journal entries
2. Serialization: If `_entries` is somehow `null`, saves as `entries: []`
3. **Journal entries never saved, appear as empty journal**
4. Deserialization: If `entries` is missing, defaults to `[]`
5. **Journal entries permanently lost**

**Fix Required**: Remove `??` fallbacks in both serialize and deserialize.

---

#### 6. PlantComponent Silent Disease/Companion Loss
**Location**: `serializers/PlantSerializer.ts:32-33`

**Issue**: Uses `||` to silently default to empty arrays for diseases and companion bonuses.

```typescript
// CURRENT (BROKEN):
diseases: plainObj.diseases || [],
companionBonuses: plainObj.companionBonuses || [],
```

**Data Loss Scenario**:
1. Plant has 3 diseases and 2 companion bonuses
2. Corruption causes `diseases` to become `null` or `false`
3. `|| []` triggers, silently defaulting to empty array
4. **Plant diseases and bonuses lost, gameplay affected**

**Fix Required**: Remove `||` fallbacks. Diseases and bonuses should always be arrays.

---

#### 7. AdminAngelComponent Conditional Memory Restoration
**Location**: `serializers/AdminAngelSerializer.ts:76-98`

**Issue**: Only restores memory fields if they exist. Missing fields are silently skipped.

```typescript
// CURRENT (BROKEN):
if (serialized.memory) {
  if (serialized.memory.playerKnowledge) {
    memory.playerKnowledge = serialized.memory.playerKnowledge;
  }
  if (serialized.memory.relationship) {
    memory.relationship = serialized.memory.relationship;
  }
  // ... more conditionals
}
```

**Data Loss Scenario**:
1. Admin angel has extensive player knowledge and relationship data
2. Corruption causes `playerKnowledge` field to become `undefined`
3. Conditional check fails, field not restored
4. **Admin angel loses all knowledge of player**
5. Tutorial progress, relationship history lost

**Fix Required**: Validate all required memory fields exist and throw if missing.

---

#### 8. AdminAngelComponent Silent Field Defaults
**Location**: `serializers/AdminAngelSerializer.ts:105-111`

**Issue**: Uses `??` to silently default component fields.

```typescript
// CURRENT (BROKEN):
component.active = serialized.active ?? true;
component.proactiveInterval = serialized.proactiveInterval ?? 1200;
component.contextWindowSize = serialized.contextWindowSize ?? 10;
component.llmProvider = serialized.llmProvider ?? null;
component.awaitingResponse = serialized.awaitingResponse ?? false;
component.pendingPlayerMessages = serialized.pendingPlayerMessages ?? [];
component.sessionStartTick = serialized.sessionStartTick ?? 0;
```

**Data Loss Scenario**:
1. Admin angel has custom settings: `proactiveInterval: 600`, `contextWindowSize: 20`
2. Corruption causes these fields to become `undefined`
3. Defaults to `1200` and `10`
4. **Custom configuration lost, angel behavior changes**

**Fix Required**: For critical fields, validate existence. For truly optional fields with defaults, document why default is acceptable.

---

### MEDIUM: WorldSerializer Data Loss

#### 9. Divine Config Silent Empty Object
**Location**: `WorldSerializer.ts:97`

**Issue**: Uses `??` to silently default to empty object when divine config is missing.

```typescript
// CURRENT (POTENTIALLY BROKEN):
config: world.divineConfig ?? {},  // UniverseDivineConfig
```

**Data Loss Scenario**:
1. Universe has divine powers enabled, belief economy configured
2. Corruption causes `divineConfig` to become `null` or `undefined`
3. Saves as `config: {}`
4. **All divine configuration lost**
5. Gods, miracles, belief system disabled

**Severity Rationale**: Medium because `divineConfig` may legitimately be empty for non-divine universes. But code should distinguish between "divine disabled" and "divine data corrupted".

**Fix Required**: Validate if divine features are expected to be present.

---

### LOW: PlanetClient Data Loss (External API)

#### 10-12. Silent Empty Array Returns
**Location**: `PlanetClient.ts:313`, `PlanetClient.ts:568`, `PlanetClient.ts:609`

**Issue**: API client uses `??` to silently default to empty arrays when server responses are missing data.

```typescript
// CURRENT (QUESTIONABLE):
return data.planets ?? [];
return data.entities ?? [];
return data.settlements ?? [];
```

**Severity Rationale**: LOW because this is external API client code, not core persistence. Server may legitimately return no data. However, should distinguish between "no data" and "malformed response".

**Fix Required**: Log warning when expected data is missing.

---

## Additional Concerns

### Type Safety Issues

#### Trust Network Map Serialization
**Location**: `serializers/TrustNetworkSerializer.ts:30`, `serializers/TrustNetworkSerializer.ts:34`

```typescript
const scores = new Map(serialized.scores ?? []);
// ...
(serialized.verificationHistory ?? []).map(...)
```

**Issue**: Map restoration with `??` fallback. If `scores` data is missing, creates empty Map.

#### Paradigm State Silent Defaults
**Location**: `serializers/ParadigmStateSerializer.ts:33`, `serializers/SkillProgressSerializer.ts:23`

```typescript
comp.paradigmState = (d.paradigmState as ...) ?? {};
comp.skillTreeState = (d.skillTreeState as ...) ?? {};
```

**Issue**: Complex nested objects with `??` fallbacks. State data loss masked.

---

## Root Cause Analysis

### Why This Happened

1. **Defensive Programming Mindset**: Developers used `??` and `||` to prevent crashes, prioritizing "works" over "correct"
2. **No Validation Strategy**: Missing distinction between "legitimately empty" and "corrupted/missing"
3. **Type System Not Enforced**: Types say required (`passages: PassageSnapshot[]`), code treats as optional
4. **No Corruption Detection**: Silent failures prevent detection of underlying corruption issues

### CLAUDE.md Violation

From CLAUDE.md:2. No Silent Fallbacks - Crash on Invalid Data
```typescript
// BAD: health = data.get("health", 100); efficiency = Math.min(1, Math.max(0, val));
// GOOD: if (!("health" in data)) throw new Error("Missing 'health'");
// Exception for truly optional: description = data.get("description", "");
```

**Current code violates this rule in 15+ locations.**

---

## Recommended Fixes

### Immediate Actions (CRITICAL)

1. **SaveLoadService.ts - Validate Top-Level Fields**
   ```typescript
   // Fix passages restoration
   if (!Array.isArray(saveFile.passages)) {
     throw new Error(
       '[SaveLoad] Save file corruption: passages field missing or invalid. ' +
       'Expected array, got ' + typeof saveFile.passages
     );
   }

   // Only restore if array has entries (empty array is valid)
   if (saveFile.passages.length > 0) {
     for (const passageSnapshot of saveFile.passages) {
       // ... restore
     }
   }

   // Fix godCraftedQueue restoration
   if (saveFile.godCraftedQueue !== undefined) {
     if (!saveFile.godCraftedQueue || typeof saveFile.godCraftedQueue !== 'object') {
       throw new Error(
         '[SaveLoad] Save file corruption: godCraftedQueue is invalid. ' +
         'Expected object with version and entries.'
       );
     }
     godCraftedQueue.deserialize(saveFile.godCraftedQueue as { version: number; entries: QueueEntry[] });
   } else {
     // Legitimately missing (old save format) - initialize empty
     console.warn('[SaveLoad] godCraftedQueue missing - initializing empty (old save format?)');
     godCraftedQueue.deserialize({ version: 1, entries: [] });
   }
   ```

2. **SpellKnowledgeSerializer.ts - Remove Silent Fallbacks**
   ```typescript
   // Validation should catch missing data before deserialization
   protected deserializeData(data: unknown): SpellKnowledgeComponent {
     const d = data as Record<string, unknown>;

     // Validation already throws if arrays are missing (lines 40-45)
     // Remove || fallbacks - if we reach here, data is valid
     const comp = createSpellKnowledgeComponent();
     comp.knownSpells = d.knownSpells as Array<...>;
     comp.knownParadigmIds = d.knownParadigmIds as string[];
     comp.activeEffects = d.activeEffects as string[];
     comp.techniqueProficiency = d.techniqueProficiency as ...;
     comp.formProficiency = d.formProficiency as ...;
     return comp;
   }
   ```

3. **EpisodicMemorySerializer.ts - Validate Memories**
   ```typescript
   protected deserializeData(data: unknown): EpisodicMemoryComponent {
     const serialized = data as SerializedEpisodicMemory;

     // Validate memories array exists
     if (!Array.isArray(serialized.memories)) {
       throw new Error(
         'EpisodicMemoryComponent corruption: memories field missing or invalid. ' +
         'Expected array, got ' + typeof serialized.memories
       );
     }

     const component = new EpisodicMemoryComponent({
       maxMemories: serialized.maxMemories,
     });

     const componentAny = component as { _episodicMemories: EpisodicMemory[] };
     componentAny._episodicMemories = serialized.memories;  // No ?? fallback

     return component;
   }
   ```

### Medium-Term Actions

4. **Add Serialization Validation Layer**
   - Create `validateSaveFileStructure()` function
   - Check all required fields exist before deserialization
   - Distinguish between "optional with default" and "required must exist"

5. **Enhance Type Safety**
   - Make `passages` explicitly required in type (remove optionality if not needed)
   - Add JSDoc comments documenting which `??` fallbacks are intentional vs bugs
   - Use `satisfies` operator to enforce type contracts

6. **Logging and Metrics**
   - Log warnings when optional fields use defaults
   - Emit metrics for missing data (track corruption rates)
   - Add telemetry for data loss detection

### Long-Term Actions

7. **Schema Versioning Enforcement**
   - Add required field checks per schema version
   - Migrations should validate before/after transformation
   - Fail fast on schema violations

8. **Corruption Recovery System**
   - Implement partial save recovery (restore what's valid, mark rest as corrupted)
   - Add "corrupted data" components (per Conservation of Matter principle)
   - Allow manual data recovery via admin tools

---

## Testing Recommendations

### Unit Tests Needed

1. **SaveLoadService corruption tests**
   - Test missing `passages` field throws error
   - Test missing `godCraftedQueue` logs warning but succeeds
   - Test invalid `godCraftedQueue` (wrong type) throws error

2. **Component serializer corruption tests**
   - Test missing arrays throw errors (not silent defaults)
   - Test null/undefined values throw errors
   - Test empty arrays serialize/deserialize correctly

3. **Type contract tests**
   - Validate SaveFile type matches runtime checks
   - Ensure required fields are actually required
   - Test optional fields handle missing data correctly

### Integration Tests Needed

1. **Save/load round-trip tests**
   - Save with full data, corrupt specific fields, verify load fails
   - Save with empty arrays, verify load succeeds with empty arrays
   - Save with missing optional fields, verify load uses correct defaults

2. **Corruption detection tests**
   - Manually corrupt save files (remove fields, change types)
   - Verify load throws descriptive errors
   - Verify checksums detect corruption

---

## Impact Assessment

### Data at Risk

- **God-crafted queue**: Microgenerator content (divine interventions, custom content)
- **Passages**: Inter-universe travel, multiverse connectivity
- **Agent memories**: Life experiences, episodic memory, journal entries
- **Spell knowledge**: Magic system progression, learned spells, proficiency
- **Plant data**: Diseases, companion bonuses (affects farming gameplay)
- **Admin angel**: Tutorial progress, player relationship, configuration

### User Impact

- **Silent progress loss**: Users lose hours of gameplay without knowing why
- **Inconsistent state**: Some data loads, some doesn't, causing bugs
- **Cascade failures**: Missing passages break time travel, affecting multiverse features
- **Trust erosion**: Unreliable saves reduce player confidence in the game

---

## Conclusion

The persistence layer has **systemic data loss vulnerabilities** due to overuse of silent fallbacks (`??`, `||`). This violates the project's "No Silent Fallbacks" principle and can cause permanent data loss without user awareness.

**Recommended Priority**: HIGH
**Estimated Effort**: 2-3 days
- Day 1: Fix CRITICAL issues (SaveLoadService, SpellKnowledge, EpisodicMemory)
- Day 2: Fix HIGH issues (remaining component serializers)
- Day 3: Add validation layer and tests

**Risk if Not Fixed**: Production data loss, player frustration, support burden, potential negative reviews.

---

## Appendix: All Affected Files

1. `packages/persistence/src/SaveLoadService.ts` (lines 407-409, 417-448, 595-597, 605-636)
2. `packages/persistence/src/WorldSerializer.ts` (line 97)
3. `packages/persistence/src/serializers/SpellKnowledgeSerializer.ts` (lines 27-31)
4. `packages/persistence/src/serializers/EpisodicMemorySerializer.ts` (line 35)
5. `packages/persistence/src/serializers/JournalSerializer.ts` (lines 21, 33)
6. `packages/persistence/src/serializers/PlantSerializer.ts` (lines 32-33)
7. `packages/persistence/src/serializers/AdminAngelSerializer.ts` (lines 76-98, 105-111)
8. `packages/persistence/src/serializers/TrustNetworkSerializer.ts` (lines 30, 34)
9. `packages/persistence/src/serializers/ParadigmStateSerializer.ts` (line 33)
10. `packages/persistence/src/serializers/SkillProgressSerializer.ts` (line 23)
11. `packages/persistence/src/serializers/CourtshipSerializer.ts` (line 96)
12. `packages/persistence/src/serializers/ManaPoolsSerializer.ts` (lines 25-26)
13. `packages/persistence/src/PlanetClient.ts` (lines 313, 568, 609)

**Total**: 13 files, 15+ distinct data loss vulnerabilities

---

**Audit Conducted By**: Claude (AI Assistant)
**Date**: February 1, 2026
**Branch**: `claude/audit-persistence-data-loss-enyS4`
