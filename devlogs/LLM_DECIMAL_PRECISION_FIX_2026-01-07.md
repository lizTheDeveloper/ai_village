# LLM Decimal Precision Fix - 2026-01-07

## Problem

LLM prompts were showing excessive decimal precision for numeric values:

```
X Position: -17.09579895842949
Faith: 0.1891524241535453 (19%)
priorities: {gathering: 0.1388888888888889, building: 0.3055555555555556...
Mood: -39.93530533033245 (30%)
```

This pollutes prompts with unnecessary precision and wastes tokens.

## Solution

Added rounding to 2 decimal places throughout `PromptRenderer.ts` `formatValue()` function.

### Files Changed

**`packages/introspection/src/prompt/PromptRenderer.ts`**

## Changes Made

### 1. Number Field Formatting (Lines 254-264)

**Before:**
```typescript
case 'number':
  if (field.range) {
    const [min, max] = field.range;
    const percentage = Math.round(((value - min) / (max - min)) * 100);
    return `${value} (${percentage}%)`;
  }
  return String(value);
```

**After:**
```typescript
case 'number':
  // Round to 2 decimal places for cleaner output
  const rounded = Math.round(value * 100) / 100;

  if (field.range) {
    const [min, max] = field.range;
    const percentage = Math.round(((value - min) / (max - min)) * 100);
    return `${rounded} (${percentage}%)`;
  }
  return String(rounded);
```

### 2. Array of Numbers (Lines 273-280)

**Before:**
```typescript
if (field.itemType === 'string' || field.itemType === 'number' || field.itemType === 'boolean') {
  return value.join(', ');
}
```

**After:**
```typescript
if (field.itemType === 'string' || field.itemType === 'number' || field.itemType === 'boolean') {
  // Round numbers to 2 decimal places
  if (field.itemType === 'number') {
    return value.map((v: number) => Math.round(v * 100) / 100).join(', ');
  }
  return value.join(', ');
}
```

### 3. Map/Object Values (Lines 292-333)

Added rounding for numeric values in:
- Map instances with primitive values
- Plain objects treated as maps
- Both now check `typeof v === 'number'` and round before formatting

**Example:**
```typescript
// Round numeric values to 2 decimal places
return entries.map(([k, v]) => {
  if (typeof v === 'number') {
    const rounded = Math.round(v * 100) / 100;
    return `${k}: ${rounded}`;
  }
  return `${k}: ${v}`;
}).join(', ');
```

### 4. Map of Objects (Lines 375-388)

Added rounding for primitive numeric values in `formatMapOfObjects()`:

```typescript
if (typeof val !== 'object' || val === null) {
  // Round numbers to 2 decimal places
  if (typeof val === 'number') {
    const rounded = Math.round(val * 100) / 100;
    return `${key}: ${rounded}`;
  }
  return `${key}: ${val}`;
}
```

### 5. Complex Object Formatting (Lines 434-444)

Added rounding in `formatComplexValue()` for generic objects:

```typescript
const parts = entries.map(([k, v]) => {
  if (typeof v === 'object' && v !== null) {
    return `${k}: {…}`;
  }
  // Round numbers to 2 decimal places
  if (typeof v === 'number') {
    const rounded = Math.round(v * 100) / 100;
    return `${k}: ${rounded}`;
  }
  return `${k}: ${v}`;
});
```

### 6. Relationship Formatting (Lines 421-428)

Added rounding for affinity and trust in relationship objects:

```typescript
if ('targetId' in obj && 'affinity' in obj) {
  const roundedAffinity = Math.round(obj.affinity * 100) / 100;
  const affinity = obj.affinity > 0 ? `+${roundedAffinity}` : roundedAffinity;
  const roundedTrust = obj.trust !== undefined ? Math.round(obj.trust * 100) / 100 : undefined;
  const trust = roundedTrust !== undefined ? `, trust ${roundedTrust}` : '';
  return `${obj.targetId} (affinity ${affinity}${trust})`;
}
```

## Expected Output

After these changes, prompts should show:

```
X Position: -17.1
Faith: 0.19 (19%)
priorities: {gathering: 0.14, building: 0.31...
Mood: -39.94 (30%)
```

## Impact

- **Cleaner prompts**: Numbers show 2 decimal places instead of 15+
- **Token savings**: Reduces token count in LLM prompts
- **Better readability**: Easier for LLMs to parse numeric values
- **Consistent formatting**: All numbers formatted the same way

## Build Status

TypeScript build passes with no errors:
```bash
$ npm run build
> @ai-village/game-engine@0.1.0 build
> tsc --build
```

## Testing Recommendations

1. Start the game with `./start.sh`
2. Spawn an LLM-enabled agent
3. Check browser console for LLM prompt content
4. Verify numeric fields show 2 decimal places max
5. Check specific fields:
   - Position (x, y) - should be `X Position: -17.1`
   - Faith - should be `0.19 (19%)`
   - Priorities object - should be `{gathering: 0.14, building: 0.31}`
   - Mood - should be `-39.94 (30%)`

## Related Systems

This fix affects all LLM prompts generated via the introspection schema system:
- Executor prompts (action selection)
- Talker prompts (conversation)
- Director prompts (city-level decisions)
- Any system using `PromptRenderer.renderEntity()` or `PromptRenderer.renderComponent()`
