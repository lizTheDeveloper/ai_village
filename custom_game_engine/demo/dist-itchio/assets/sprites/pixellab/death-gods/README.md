# Death Gods Collection

Dynamic character portraits for gods of death from various cultural traditions and original designs.

**Format**: 48×48px, 8 directions (south, west, east, north, south-east, north-east, north-west, south-west)
**Created**: 2026-01-02

## Characters

### 1. Plague Doctor Death God
**Folder**: `plague-doctor/`
**Theme**: Medieval/Renaissance plague doctor
**Key Features**:
- Black leather plague doctor mask with elongated beak
- Wide-brimmed hat casting shadows
- Dark green tattered greatcoat with bronze clasps
- Ornate glass vial filled with glowing souls
- Bandolier of mystical remedies
- Eerie leaning forward pose
**Proportions**: Tall and gaunt (head 1.2, shoulders 0.7, hips 0.6)
**Style**: Black outline, detailed shading, high detail

### 2. Day of the Dead Goddess
**Folder**: `day-of-dead-goddess/`
**Theme**: Mexican Día de los Muertos
**Key Features**:
- Ornate calavera (sugar skull) face paint in vibrant colors
- Red and gold traditional Mexican dress with embroidered flowers
- Crown of marigold flowers and candles
- Decorative staff with burning candle
- Jewelry of small bones and gold
- Roses in long black hair
- Blessing pose with one hand raised
**Proportions**: Default
**Style**: Black outline, detailed shading, high detail

### 3. Valraven Death Goddess
**Folder**: `valraven-goddess/`
**Theme**: Nordic/Viking warrior
**Key Features**:
- Braided white hair
- Ornate raven-feather cloak
- Dark iron armor with knotwork engravings
- Massive battle-axe with glowing blue runes
- Ravens perched on shoulders
- War paint streaks
- Fur trim on boots and gauntlets
- Commanding stance with weapon raised
- Glowing otherworldly eyes
**Proportions**: Heroic
**Style**: Black outline, detailed shading, high detail

### 4. Clockwork Death Reaper
**Folder**: `clockwork-reaper/`
**Theme**: Victorian steampunk automaton
**Key Features**:
- Exposed brass gears through glass chest panel
- Elegant top hat with embedded clock face
- Monocle with red glowing lens
- Mechanical jaw with brass teeth
- Formal tailcoat in midnight blue with copper accents
- Ornate pocket watch controlling time of death
- Steam venting from joints
- One arm is mechanical scythe attachment
- Dignified posture checking watch
**Proportions**: Slightly tall (head 1.1, shoulders 0.9, hips 0.7)
**Style**: Black outline, detailed shading, high detail

### 5. Mushroom Circle Death Druid
**Folder**: `mushroom-druid/`
**Theme**: Ancient forest spirit
**Key Features**:
- Body covered in moss and lichen
- Antler crown with glowing mushrooms growing from points
- Tattered leaf and vine robes in autumn colors
- Staff of twisted dead wood with firefly lantern
- Face partially obscured by hanging vines and moss
- Bare feet with roots growing from toes
- Hunched mystical posture
- Surrounded by floating spores
- One hand reaching out to guide souls
**Proportions**: Hunched mystical (head 1.3, legs 0.9, shoulders/hips 0.8)
**Style**: Selective outline, detailed shading, high detail

### 6. Cosmic Void Death Entity
**Folder**: `cosmic-void-entity/`
**Theme**: Cosmic/space horror
**Key Features**:
- Flowing robes resembling deep space with stars and nebulae
- Face hidden beneath hood showing swirling galaxy for eyes
- Staff topped with miniature black hole
- Constellation patterns glowing on hands
- Robes trailing off into stardust
- Body phases between solid and energy
- Reaching pose pulling souls across dimensions
- Aurora borealis effect around edges
**Proportions**: Ethereal (head 1.0, arms 1.2, legs 1.1, shoulders 0.8, hips 0.7)
**Style**: **Lineless** (painterly), detailed shading, high detail

## Design Principles

Each death god was designed with:
1. **Distinctive Silhouette**: Unique headgear/accessories make them instantly recognizable
2. **Cultural Identity**: Drawing from real-world death mythology (plague doctor, Catrina, Valkyrie) or original concepts
3. **Dynamic Poses**: Active, dramatic poses instead of static standing
4. **Visual Effects**: Glowing elements, particles, environmental effects
5. **Varied Proportions**: Different body types create distinct visual profiles
6. **Style Variation**: Mix of outline styles (black, selective, lineless) for variety

## Usage in Game

These characters are ideal for:
- **Psychopomp NPCs**: Guides who ferry souls to the afterlife
- **Death Deity Encounters**: Divine beings overseeing death and rebirth systems
- **Unique Boss Characters**: End-game encounters with distinct visual identities
- **Cultural Flavor**: Representing different traditions within the game world
- **Quest Givers**: NPCs who offer death-related quests or bargains

## Integration with Soul/Afterlife Systems

These sprites directly support game systems:
- `SoulCreationSystem.ts` - Soul creation ceremonies
- `DeathJudgmentSystem.ts` - Judging souls for afterlife
- `DeathBargainSystem.ts` - Making bargains with death gods
- `GodOfDeathEntity.ts` - Death god entity implementation
- `RiddleGenerator.ts` - Death god riddle challenges

See `/packages/core/src/divinity/` for implementation details.

## File Structure

Each character folder contains:
```
character-name/
├── metadata.json           # Full character metadata (28KB)
└── rotations/
    ├── south.png          # Facing camera
    ├── north.png          # Facing away
    ├── east.png           # Facing right
    ├── west.png           # Facing left
    ├── south-east.png     # Diagonal
    ├── south-west.png     # Diagonal
    ├── north-east.png     # Diagonal
    └── north-west.png     # Diagonal
```

All PNGs are 48×48px with transparent backgrounds.

## Character IDs (for PixelLab API)

- Plague Doctor: `ad8cf632-6122-4d6a-a359-125c26d1b32c`
- Day of the Dead Goddess: `4e084cf4-4d07-48f5-9f71-efc37d27eca5`
- Valraven Death Goddess: `e53fdc7a-1a1f-4e21-934d-a016ec251df5`
- Clockwork Death Reaper: `94af6bc2-67e7-4c84-ab00-9a0150544e5e`
- Mushroom Circle Death Druid: `090f6ccf-dcf2-4381-9f92-aec0f8e168b2`
- Cosmic Void Death Entity: `eff6daea-1edc-4e5b-8015-92bcc54442f8`

Use these IDs to add animations via `animate_character()` API.
