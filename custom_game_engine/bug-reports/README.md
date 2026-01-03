# Bug Reports Queue

This directory contains automatically generated bug reports for corrupted data and validation failures.

## Directory Structure

- **active/** - Unresolved bug reports requiring investigation
- **resolved/** - Bug reports that have been fixed

## Bug Report Format

Each bug report is a JSON file with the following structure:

```json
{
  "id": "bug-1767290000-abc123",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "category": "corrupted_data",
  "severity": "high",
  "component": "PlantSystem",
  "entityId": "entity-uuid",
  "entityType": "plant",
  "error": "Description of the error",
  "details": {
    "reason": "Missing position field",
    "plantData": { ... }
  },
  "stackTrace": "Error stack trace (if available)"
}
```

## Bug Categories

- **corrupted_data** - Entity data is missing or invalid
- **validation_failure** - Data failed validation checks
- **system_error** - System-level errors
- **unknown** - Uncategorized errors

## Severity Levels

- **critical** - System cannot function, immediate attention required
- **high** - Core functionality broken, should be fixed soon
- **medium** - Feature degradation, fix when possible
- **low** - Minor issue, cosmetic or edge case

## When Bug Reports Are Filed

Bug reports are automatically created when:

1. **PlantSystem** detects corrupted plant entities:
   - Missing position field
   - Invalid position coordinates
   - Unknown plant species
   - Missing critical fields (health, hydration, nutrition)
   - Fruit regeneration failures

2. **Plant validation script** (`fix-broken-plants.ts`) finds broken plants during startup

3. Other systems detect corrupted or invalid data

## Viewing Bug Reports

Use the bug report utility script:

```bash
# View all active bugs
npx tsx scripts/view-bug-reports.ts

# View bugs by category
npx tsx scripts/view-bug-reports.ts --category corrupted_data

# View bugs by severity
npx tsx scripts/view-bug-reports.ts --severity high

# View summary
npx tsx scripts/view-bug-reports.ts --summary
```

## Resolving Bug Reports

Once a bug has been fixed:

1. Verify the fix in the codebase
2. Move the bug report from `active/` to `resolved/`:
   ```bash
   npx tsx scripts/view-bug-reports.ts --resolve bug-1767290000-abc123
   ```

Or manually:
```bash
mv bug-reports/active/bug-1767290000-abc123.json bug-reports/resolved/
```

## Integration Points

The BugReporter is integrated into:

- `packages/core/src/systems/PlantSystem.ts` - Lines 189, 206, 227, 1242
- `scripts/fix-broken-plants.ts` - Lines 44, 62, 80, 98

To add bug reporting to other validation code:

```typescript
import { BugReporter } from '../packages/core/src/utils/BugReporter.js';

// For corrupted plants
BugReporter.reportCorruptedPlant({
  entityId: entity.id,
  reason: 'Description of the problem',
  plantData: { ... }
});

// For generic validation failures
BugReporter.reportValidationFailure({
  component: 'YourSystem',
  entityId: entity.id,
  entityType: 'entity_type',
  error: 'Validation error description',
  details: { ... }
});

// For custom bug reports
BugReporter.fileBugReport({
  category: 'corrupted_data',
  severity: 'high',
  component: 'SystemName',
  entityId: 'entity-id',
  error: 'Error description',
  details: { ... }
});
```
