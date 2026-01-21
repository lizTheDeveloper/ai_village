#!/bin/bash
cd /Users/annhoward/src/ai_village/custom_game_engine/packages/language
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Running tsc..."
npx tsc
echo "Build exit code: $?"
ls -la dist/ 2>&1 | head -20
