# Qwen Building Design Test Results

## Summary

**Model**: Qwen 3 32B (via Groq API)
**Date**: 2025-01-19
**Success Rate**: 1/3 buildings (33%)

## Successful Building

### Coral Beach Cottage (Tier 2)
- **ID**: `coral_beach_house`
- **Category**: Residential
- **Materials**: Coral walls, wooden floors, glass windows
- **Size**: 6x5 tiles (30 total)
- **Features**: Bed, table, window
- **Functionality**: Sleeping + work
- **Capacity**: 2 people
- **Validation**: ✅ PASSED - all rules met

**Layout**:
```
######
#B..W#
#.T..D
#....#
######
```

**Why it's unique**:
- Uses coral material (beach theme)
- Includes window for natural light
- Hybrid wood/coral materials
- Larger than most tier-1 buildings
- Well-designed floor plan with proper pathfinding

## Failed Buildings

### 1. Wooden Cottage (Tier 1)
- **Error**: Door not properly placed between walls
- **Issue**: Door at position (3, 2) lacked proper wall support
- **Lesson**: Qwen struggles with edge door placement

### 2. Stone Workshop (Tier 2)
- **Error**: No valid entrance, floating internal wall
- **Issues**:
  - Building had no entrance connecting to exterior
  - Internal wall segment blocking access
- **Lesson**: Qwen doesn't fully understand "reachable from exterior" requirement

## Qwen Capabilities Assessment

### ✅ Strengths
1. **Material Selection**: Correctly chose creative materials (coral for beach cottage)
2. **Feature Placement**: Properly placed furniture (bed, table, storage)
3. **Size Constraints**: Followed tile size requirements (4x4, 5x5, 6x5)
4. **JSON Format**: Generated valid JSON (after thinking blocks removed)
5. **Creativity**: Designed unique layouts different from examples

### ⚠️ Weaknesses
1. **Door Placement**: Struggles with "between walls" rule
2. **Pathfinding**: Doesn't always ensure all rooms reachable
3. **Verbosity**: Produces lengthy `<think>` blocks that can exceed token limits
4. **Validation Rules**: Doesn't fully internalize complex spatial rules

## Optimization Changes

To improve success rate, we made these changes:

### Before (0/5 success)
- System prompt: 400+ words
- Max tokens: 2000
- Temperature: 0.8
- Test prompts: Long, descriptive

### After (1/3 success)
- System prompt: 150 words + "Keep responses brief" instruction
- Max tokens: 4000
- Temperature: 0.7
- Test prompts: Short, direct

### Key improvements:
1. Added explicit instruction: "Return ONLY valid JSON. No long explanations."
2. Doubled max_tokens to accommodate thinking blocks
3. Simplified test prompts to reduce cognitive load
4. Removed unnecessary material lists from prompt
5. Reduced temperature for more focused output

## Recommendations

### For Production Use
1. **Add few-shot examples**: Include 2-3 valid building examples in prompt
2. **Explicit door rules**: Provide visual ASCII examples of valid door placements
3. **Post-processing**: Auto-fix common door placement errors
4. **Retry logic**: Regenerate on validation failure with error feedback
5. **Temperature tuning**: Try 0.5-0.6 for more deterministic output

### For Better Validation
1. **Iterative generation**: Show Qwen validation errors and ask it to fix
2. **Guided prompts**: "Place door on bottom wall, middle position"
3. **Constraint templates**: Provide pre-made wall layouts with `[PLACE_DOOR_HERE]` markers

### For Scale
1. **Batch generation**: Generate 10 buildings, keep top 3 that validate
2. **Ensemble approach**: Use multiple prompts/temperatures, merge best results
3. **Human-in-loop**: Generate candidates, human selects/tweaks best ones

## Conclusion

**Qwen can design valid buildings** but needs:
- Clearer spatial reasoning guidance
- Examples of valid door placements
- Post-processing to fix common errors

The successful Coral Beach Cottage demonstrates that Qwen can create **unique, creative, and valid buildings** when the prompt is well-tuned. With improvements to the prompt and validation loop, we could achieve 60-80% success rate.

## Next Steps

1. ✅ Test completed - Qwen can design buildings
2. Add few-shot examples to prompt
3. Implement validation feedback loop
4. Create batch generation script
5. Add to game's building generation pipeline
