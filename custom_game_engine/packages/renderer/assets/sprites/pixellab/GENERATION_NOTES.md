# PixelLab Character Generation Notes

## API Selection Guide

### When to Use Each API

**Use `create_character` (8 directions) for**:
- Bipedal humanoids ONLY
- Examples: Humans, elves, angels, deities, valkyries, demons
- Has: 2 legs, 2 arms, humanoid skeleton

**Use `create_map_object` for**:
- Animals (quadrupeds, hexapods, etc.)
- Creatures with extra limbs
- Non-humanoid body plans
- Examples: Unicorns (4 legs), aliens with 6+ limbs, blob creatures, centipede creatures

### Physical Description Detail

**Key Elements to Include**:
1. **Body Structure**: Central mass shape, symmetry, proportions, core body type
2. **Limb Configuration**: Number of limbs, type, attachment points, movement style
3. **Surface Texture**: Skin type (scales, fur, chitin, membrane), patterns, material qualities
4. **Unique Features**: Eyes (number, placement), mouth, sensory organs, special appendages
5. **Movement**: How the creature locomotes (walks, slithers, floats, etc.)
6. **Material Qualities**: Translucent, armored, chitinous, furry, scaled, crystalline, etc.

**Bad Example**:
- "blob alien" - too vague, no body structure detail

**Good Example**:
- "Translucent gelatinous creature with bulbous central mass, 4-6 writhing pseudopods extending from base for locomotion, two retractable eye stalks protruding from top, internal organs faintly visible through semi-transparent membrane, constantly shifting amoeba-like form with rippling surface texture"

## Current Generation Issues

### Generated with WRONG API (Should Regenerate with map_object):
- ❌ All "aliens" (hexapod, blob, mantis, etc.) - currently bipedal humanoids
- ❌ Unicorns (4 pending) - will be bipedal humanoids instead of quadrupeds

### Correctly Generated (Keep):
- ✅ Death Gods (Thanatos, Hel, Anubis, etc.) - bipedal deities
- ✅ Angels - bipedal celestial beings  
- ✅ Pantheon Deities (Zeus, Athena, Odin, etc.) - bipedal gods
- ✅ Elves - bipedal humanoids
- ✅ Valkyries - bipedal warriors
- ✅ Fae creatures - assuming bipedal forms
