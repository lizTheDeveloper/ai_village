# Conservation of Game Matter: Nothing Is Ever Deleted

> **FUNDAMENTAL PRINCIPLE**: Like conservation of matter in physics, **nothing in the game is ever truly deleted**.

## The Rule

**NEVER delete entities, souls, items, universes.** Mark as corrupted/rejected and preserve for recovery.

```typescript
// BAD: world.removeEntity(brokenEntity); delete corruptedSave; souls.splice(deadSoulIndex, 1);
// GOOD: Mark corrupted and preserve
brokenEntity.addComponent({ type: 'corrupted', corruption_reason: 'malformed_data', corruption_date: Date.now(), recoverable: true });
corruptedSave.status = 'corrupted'; corruptedSave.preserve = true;
deadSoul.addComponent({ type: 'deceased', death_cause: 'old_age', preserveForAfterlife: true });
```

## Why This Matters

1. **Future Recovery**: Data fixer scripts can repair corrupted content later
2. **Emergent Gameplay**: Corrupted content becomes discoverable via quests/items
3. **No Data Loss**: Players never lose progress permanently
4. **Debugging**: Inspect what went wrong and why
5. **Lore Integration**: "Corrupted universes" and "rejected spells" become part of the game world
6. **Player Archaeology**: Finding broken/old content becomes gameplay

## Corruption Types

```typescript
// Failed validation
{ type: 'corrupted', corruption_reason: 'validation_failed'|'malformed_data'|'logic_error'|'reality_breaking',
  original_data: any, corruption_date: number, recoverable: boolean, recovery_requirements?: string[] }

// Rejected by validators
{ type: 'rejected_artifact', rejection_reason: 'too_overpowered'|'unstable_magic'|'lore_breaking'|'too_meta',
  rejected_by: string, banished_to: 'limbo'|'void'|'forbidden_library'|'rejected_realm',
  retrievable: boolean, danger_level: number }

// Failed universe generation
{ type: 'corrupted_universe', generation_error: string, stability: number,
  accessible_via: string[], contains_treasures: boolean }
```

## Corrupted Realms

All corrupted/rejected content is banished to special realms:

| Realm | Contents | Danger |
|-------|----------|--------|
| **Limbo** | Mild corruption | Low |
| **The Void** | Severe corruption | High |
| **Forbidden Library** | Rejected overpowered items/spells | Medium |
| **Rejected Realm** | Failed/meta-breaking creations | Variable |
| **Corrupted Timelines** | Failed universe generation | High |

Players access these realms via special items/quests.

## Implementation

```typescript
class CorruptionService {
  markAsCorrupted(entity: Entity, reason: string): void {
    entity.addComponent({ type: 'corrupted', corruption_reason: reason, corruption_date: Date.now(),
      recoverable: this.assessRecoverability(entity, reason) });
    this.banishToCorruptedRealm(entity, reason);
  }
  async attemptRecovery(corruptedEntity: Entity, fixerScript: string): Promise<boolean> { /* repair corruption */ }
}
```

## Save/Load Integration

Corrupted content persists in saves:

```json
{ "world": { "entities": [
  { "id": "corrupted_spell_12345", "components": {
    "generated_content": { "contentType": "spell", "content": { "spellName": "Reality Tear", "damage": 9999 } },
    "rejected_artifact": { "rejection_reason": "too_overpowered", "banished_to": "forbidden_library", "retrievable": true, "danger_level": 10 } } },
  { "id": "corrupted_universe_789", "components": {
    "corrupted_universe": { "generation_error": "NaN coordinates", "stability": 23, "accessible_via": ["shard_of_dimensional_access"] } } }
] } }
```

## Examples

### Corrupted Item - Invalid Stats
```typescript
if (item.damage < 0 || item.damage > 1000) {
  item.addComponent({ type: 'corrupted', corruption_reason: 'invalid_damage_value', original_damage: item.damage, recoverable: true });
  item.damage = 0; // Safe default, can be fixed later with "Repair Corrupted Item" spell
}
```

### Rejected Spell - Too Powerful
```typescript
if (spell.damage > 500) {
  entity.addComponent({ type: 'rejected_artifact', rejection_reason: 'too_overpowered', rejected_by: 'god_of_balance',
    banished_to: 'forbidden_library', retrievable: true, danger_level: 9 }); // Players can quest for this
}
```

### Failed Universe - Generation Crashed
```typescript
try { universe = generateUniverse(seed); }
catch (error) {
  const corruptedUniverse = world.createEntity();
  corruptedUniverse.addComponent({ type: 'corrupted_universe', generation_error: error.message, seed, stability: 0,
    accessible_via: ['shard_of_broken_worlds'], contains_treasures: true }); // Explorable location with glitched items
}
```

### Dead Soul - Preserve for Afterlife
```typescript
agent.addComponent({ type: 'deceased', death_cause: 'dragon_fire', death_location: { x: 100, y: 200 }, preserveForAfterlife: true });
agent.addComponent({ type: 'ghost', hauntsLocation: { x: 100, y: 200 }, visible: false, resurrectableVia: ['resurrection_spell', 'necromancy'] });
```

## Client vs Server

**Client deletion OK. Server preserves forever.**

```typescript
clientWorld.removeUniverse('broken_universe_beta_test_001'); // Removed from client
serverWorld.markUniverseAsOrphaned('broken_universe_beta_test_001', {
  reason: 'client_deleted', original_player: 'player_123', deletion_date: Date.now(),
  still_accessible: true, discoverable_by_others: true }); // Other players can find it
```

**Benefits**: No data loss (server preserves even if client deletes), shared archaeology (other players find "abandoned" universes), development artifacts persist, deleted content becomes "forgotten realms" in-game.

## Development as Lore (Proto-Realities)

All universes created during development become canonical **proto-realities**:

```typescript
const protoUniverse = generateUniverse({ seed: 'early_dev_test_42', era: 'before_time_was_invented' });
// Generation crashes with NaN → becomes proto-reality
protoUniverse.addComponent({ type: 'proto_reality', era: 'before_time', stability: 12, generation_error: 'time_not_yet_invented',
  contains_primordial_artifacts: true, lore: 'A universe from when time was still being defined. Physics differ. Causality is negotiable.' });
```

### Proto-Reality Archive Mapping

| Development Artifact | In-Game Lore |
|---------------------|--------------|
| Early dev universes | "From the time before time" |
| Failed beta tests | "Experiments of the Creator Gods" |
| Corrupted saves | "Realities that the gods abandoned" |
| Glitched content | "Primordial chaos artifacts" |

### Quest Example
```typescript
{ quest: 'Journey to the Time Before Time', description: 'Find Shard of Primordial Access to explore proto-realities.',
  rewards: ['Proto-reality access', 'Glitched items with impossible stats', 'Multiverse creation lore', 'Materials that should not exist'] }
```

## Server Archive Configuration

```typescript
const SERVER_ARCHIVE_POLICY = {
  soft_delete_only: true, preserve_metadata: true, orphaned_content_discoverable: true,
  dev_content_becomes_lore: true, dev_era_label: 'proto_reality',
  corruption_realms: { limbo: 'Mild, low danger', void: 'Severe, high danger', forbidden_library: 'Too powerful',
    proto_reality: 'Before time', forgotten_realm: 'Deleted by creators' }
};
```

**All development mistakes become features. All broken content becomes lore.**
