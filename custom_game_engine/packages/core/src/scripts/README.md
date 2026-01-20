# Core Scripts

Utility scripts for codebase analysis and optimization.

## Query Optimization Tools

### analyze-query-patterns.ts

Automated detection of query anti-patterns in TypeScript systems.

**Quick Start:**
```bash
cd custom_game_engine/packages/core

# Analyze all Phase 1-5 systems
npx tsx src/scripts/analyze-query-patterns.ts

# Analyze specific file
npx tsx src/scripts/analyze-query-patterns.ts --file=TradeNetworkSystem.ts
```

**What It Detects:**
- ❌ **CRITICAL**: Queries inside loops (O(n²) complexity)
- ⚠️ **IMPORTANT**: Repeated singleton queries
- ℹ️ **MINOR**: Inefficient filter operations

**Output:**
```
═══════════════════════════════════════════════════════════
  Query Optimization Analysis
═══════════════════════════════════════════════════════════

Summary:
  Files analyzed: 15
  Total issues:   0
    Critical:     0 (queries in loops)
    Important:    0 (repeated singletons)
    Minor:        0 (inefficient filters)

✓ No query optimization issues found!
```

**Exit Codes:**
- `0` - No critical issues found
- `1` - Critical issues detected

**Related Documentation:**
- [QUERY_OPTIMIZATION_REPORT.md](./QUERY_OPTIMIZATION_REPORT.md) - Detailed analysis
- [QUERY_OPTIMIZATION_SUMMARY.md](./QUERY_OPTIMIZATION_SUMMARY.md) - Executive summary

---

## Other Scripts

### generate-dependency-graph.ts
Generate system dependency graphs (existing script)

### audit-system-interactions.ts
Audit component interactions (existing script)

---

## Adding New Scripts

1. Create script in `src/scripts/`
2. Use ESM imports (`import` not `require`)
3. Add to this README
4. Follow CLAUDE.md guidelines:
   - No silent fallbacks
   - Throw on errors
   - Clear error messages

**Template:**
```typescript
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM equivalents
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function main(): void {
  try {
    // Script logic
  } catch (error) {
    if (error instanceof Error) {
      console.error(`ERROR: ${error.message}`);
    }
    process.exit(1);
  }
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}

// Export for testing
export { /* exports */ };
```

---

## CI Integration (Future)

To add query analysis to CI pipeline:

```yaml
# .github/workflows/performance.yml
- name: Check Query Optimization
  run: |
    cd custom_game_engine/packages/core
    npx tsx src/scripts/analyze-query-patterns.ts
```

This will fail the build if critical query issues are detected.
