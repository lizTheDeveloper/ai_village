#!/usr/bin/env bash
# Script to fix `as any` type casts in magic applier files

set -e

# Define the packages directory
MAGIC_DIR="./packages/magic/src"

echo "Fixing 'as any' type casts in magic applier files..."

# Fix ControlEffectApplier - dotType
sed -i '' 's/effect\.dotType as any/effect.dotType/g' "$MAGIC_DIR/appliers/ControlEffectApplier.ts"

# Fix ControlEffectApplier - NeedsComponent health
sed -i '' 's/(needs as any)\.health/needs.health/g' "$MAGIC_DIR/appliers/ControlEffectApplier.ts"

# Fix ControlEffectApplier - status_effects component
sed -i '' "s/{ type: 'status_effects', isStunned: true } as any/{ type: 'status_effects' as const, isStunned: true }/g" "$MAGIC_DIR/appliers/ControlEffectApplier.ts"

# Fix ControlEffectApplier - behavior component
sed -i '' "s/{ type: 'behavior', currentBehavior: 'flee' } as any/{ type: 'behavior' as const, currentBehavior: 'flee' as const }/g" "$MAGIC_DIR/appliers/ControlEffectApplier.ts"

echo "Fixed Control EffectApplier"

# More comprehensive fixes can be added here as needed

echo "All fixes applied successfully!"
