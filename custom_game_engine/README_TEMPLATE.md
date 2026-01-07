# {Package Name} - {Brief Description}

> **For Language Models:** This README is optimized for LM understanding. Read this document completely before working with the {system name} to understand its architecture, interfaces, and usage patterns.

## Overview

{1-2 paragraph overview of what this package does}

**What it does:**
- {Key feature 1}
- {Key feature 2}
- {Key feature 3}

**Key files:**
- `{path/to/main/system.ts}` - {Description} (priority X)
- `{path/to/component.ts}` - {Description}
- `{path/to/types.ts}` - {Description}

---

## Package Structure

```
packages/{package-name}/
├── src/
│   ├── systems/
│   │   └── {SystemName}.ts         # {Brief description}
│   ├── components/
│   │   └── {ComponentName}.ts      # {Brief description}
│   ├── types/
│   │   └── {TypesFile}.ts          # {Brief description}
│   └── index.ts                    # Package exports
├── package.json
└── README.md                       # This file
```

---

## Core Concepts

### 1. {Concept Name}

{Explanation of the first major concept}

```typescript
// Example code showing the concept
interface Example {
  field: string;
}
```

### 2. {Concept Name}

{Explanation of the second major concept}

### 3. {Concept Name}

{Explanation of the third major concept}

---

## System APIs

### {SystemName} (Priority X)

{Brief description of what this system does}

**Dependencies:** `{Dependency1}`, `{Dependency2}`

**Update interval:** {Description of update frequency}

**Key methods:**

```typescript
class {SystemName} {
  // Document the public API methods
  methodName(param: Type): ReturnType;
}
```

**Events emitted:**

```typescript
// List all events this system emits
'{event:name}' → { field1, field2 }
'{event:name2}' → { field1, field2 }
```

**Creating {entities}:**

```typescript
// Show how to create and use entities with this system
const entity = world.createEntity();
// ...
```

**Reading {entity} state:**

```typescript
// Show how to query and read entity state
const entities = world.query().with('{component_type}').executeEntities();
```

---

## Usage Examples

### Example 1: {Task Description}

```typescript
// Complete, runnable example
```

### Example 2: {Task Description}

```typescript
// Complete, runnable example
```

### Example 3: {Task Description}

```typescript
// Complete, runnable example
```

---

## Architecture & Data Flow

### System Execution Order

```
1. {System1} (priority X)
   ↓ {What it does}
2. {System2} (priority Y)
   ↓ {What it does}
3. {ThisSystem} (priority Z)
   ↓ {What it does}
```

### Event Flow

```
{SourceSystem}
  ↓ '{event:name}'
{ThisSystem}
  → {What happens}

{ThisSystem}
  ↓ '{event:name}'
{TargetSystem}
  → {What happens}
```

### Component Relationships

```
Entity
├── {ComponentName} (required/optional)
│   ├── field1 → {Type}
│   └── field2 → {Type}
└── {OtherComponent} (required/optional)
```

---

## Performance Considerations

{List any performance-critical aspects}

**Optimization strategies:**

1. {Strategy 1}
2. {Strategy 2}
3. {Strategy 3}

**Query caching:**

```typescript
// ❌ BAD: Inefficient pattern
// ...

// ✅ GOOD: Optimized pattern
// ...
```

---

## Troubleshooting

### {Problem Description}

**Check:**
1. {Thing to check}
2. {Thing to check}
3. {Thing to check}

**Debug:**
```typescript
// Debug code example
```

### {Problem Description}

**Check:**
1. {Thing to check}

**Debug:**
```typescript
// Debug code example
```

### {Common Error}

**Error:** `{Error message}`

**Fix:** {How to fix it}

```typescript
// Fix code example
```

---

## Integration with Other Systems

### {Related System 1}

{How this system integrates with another system}

```typescript
// Integration code example
```

### {Related System 2}

{How this system integrates with another system}

```typescript
// Integration code example
```

---

## Testing

Run tests:

```bash
npm test -- {TestFile}.test.ts
```

**Key test files:**
- `{path/to/test1.test.ts}`
- `{path/to/test2.test.ts}`

---

## Further Reading

- **SYSTEMS_CATALOG.md** - Complete system reference
- **COMPONENTS_REFERENCE.md** - All component types
- **METASYSTEMS_GUIDE.md** - Related metasystem information
- **PERFORMANCE.md** - Performance optimization guide
- **{Related documentation}** - {Description}

---

## Summary for Language Models

**Before working with {system name}:**
1. {Key thing to understand #1}
2. {Key thing to understand #2}
3. {Key thing to understand #3}

**Common tasks:**
- **{Task}:** {How to do it}
- **{Task}:** {How to do it}
- **{Task}:** {How to do it}

**Critical rules:**
- {Important rule to follow}
- {Important rule to follow}
- {Important rule to follow}

**Event-driven architecture:**
- Listen to `{event:*}` events for {purpose}
- Emit events when {condition}
- Never bypass {SystemName} for {action}
