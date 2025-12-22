# Agent Inventory Display - Specification

**Created:** 2025-12-22
**Status:** Draft
**Version:** 0.1.0
**Phase:** 7 (Building & Shelter)

---

## Overview

A minimal inventory display integrated into the existing AgentInfoPanel. Shows what resources an agent is currently carrying. This is a stepping stone toward the full inventory UI (Phase 10).

---

## Motivation

Currently, agents can gather resources (wood, stone, food, water) but there's no way to see what they're carrying. The player cannot observe:
- Resource gathering working
- Construction resource consumption
- Agent inventory state

This spec adds a simple resource display to the existing agent selection panel.

---

## Requirements

### REQ-AID-001: Inventory Section in AgentInfoPanel

The AgentInfoPanel SHALL include an inventory section showing carried resources.

```typescript
interface AgentInventoryDisplay {
  // Data source
  inventoryComponent: InventoryComponent;

  // Display state
  resources: ResourceCount[];
  totalWeight: number;
  maxWeight: number;
  usedSlots: number;
  maxSlots: number;
}

interface ResourceCount {
  type: ResourceType;      // 'wood' | 'stone' | 'food' | 'water'
  amount: number;
  icon: string;            // Emoji or sprite reference
}
```

### REQ-AID-002: Visual Layout

The inventory display SHALL appear below the existing needs section.

```
┌─────────────────────────────────────┐
│ 🧑 Agent: Villager #1                │
├─────────────────────────────────────┤
│ Behavior: gathering                  │
│ Position: (124, 87)                  │
├─────────────────────────────────────┤
│ NEEDS                                │
│ 🍖 Hunger:  ████████░░ 80%          │
│ ⚡ Energy:  ██████████ 100%          │
│ ❤️ Health:  ██████████ 100%          │
├─────────────────────────────────────┤
│ INVENTORY                            │
│ 🪵 Wood:   12                        │
│ 🪨 Stone:   5                        │
│ 🍎 Food:    3                        │
│ 💧 Water:   0                        │
│                                      │
│ Weight: 45/100  Slots: 4/8           │
└─────────────────────────────────────┘
```

### REQ-AID-003: Resource Icons

Each resource type SHALL have a distinct icon.

```typescript
const RESOURCE_ICONS: Record<ResourceType, string> = {
  wood: '🪵',
  stone: '🪨',
  food: '🍎',
  water: '💧',
};
```

### REQ-AID-004: Real-time Updates

The inventory display SHALL update in real-time as the agent:
- Gathers resources (amount increases)
- Consumes resources (amount decreases)
- Drops items
- Uses items for construction

### REQ-AID-005: Empty Inventory State

When an agent has no items, the display SHALL show:

```
│ INVENTORY                            │
│ (empty)                              │
│                                      │
│ Weight: 0/100  Slots: 0/8            │
```

### REQ-AID-006: Capacity Warning

When inventory is nearly full (>80% weight or slots), show warning color.

```typescript
interface CapacityDisplay {
  weightPercent: number;
  slotsPercent: number;

  // Colors
  normalColor: string;      // White/default
  warningColor: string;     // Yellow at 80%
  fullColor: string;        // Red at 100%
}
```

---

## Implementation Notes

### Integration Point

Modify existing `AgentInfoPanel.ts`:

```typescript
// In renderAgentInfo() method, after needs section:

private renderInventory(ctx: CanvasRenderingContext2D, y: number): number {
  const inventory = this.world.getComponent<InventoryComponent>(
    this.selectedAgent,
    'inventory'
  );

  if (!inventory) {
    return y;  // No inventory component
  }

  // Draw "INVENTORY" header
  ctx.fillText('INVENTORY', x, y);
  y += lineHeight;

  // Count resources by type
  const counts = this.countResourcesByType(inventory);

  // Draw each resource
  for (const [type, amount] of Object.entries(counts)) {
    const icon = RESOURCE_ICONS[type as ResourceType];
    ctx.fillText(`${icon} ${type}: ${amount}`, x, y);
    y += lineHeight;
  }

  // Draw capacity
  const weightPercent = (inventory.currentWeight / inventory.maxWeight) * 100;
  const slotsUsed = inventory.slots.filter(s => s !== null).length;
  ctx.fillText(
    `Weight: ${inventory.currentWeight}/${inventory.maxWeight}  Slots: ${slotsUsed}/${inventory.maxSlots}`,
    x, y
  );

  return y + lineHeight;
}

private countResourcesByType(inventory: InventoryComponent): Record<string, number> {
  const counts: Record<string, number> = {
    wood: 0,
    stone: 0,
    food: 0,
    water: 0,
  };

  for (const slot of inventory.slots) {
    if (slot && slot.resourceType in counts) {
      counts[slot.resourceType] += slot.quantity;
    }
  }

  return counts;
}
```

---

## Acceptance Criteria

1. When clicking an agent, the info panel shows their inventory
2. Resource counts update in real-time during gathering
3. Empty inventory shows "(empty)" message
4. Weight and slot capacity are displayed
5. No new UI panel - extends existing AgentInfoPanel

---

## Dependencies

- `InventoryComponent` - Already exists in `packages/core`
- `AgentInfoPanel` - Already exists in `packages/renderer`
- Resource gathering system - Currently in development

---

## Future Extensions (Phase 10)

This minimal display will be replaced by the full inventory UI in Phase 10:
- Grid-based slot display
- Drag and drop
- Equipment slots
- Item tooltips
- Search and filter

See `inventory.md` for the complete spec.

---

## Related Specs

- `items-system/spec.md` - Item and resource definitions
- `construction-system/spec.md` - Resource consumption for building
- `inventory.md` - Full inventory UI (Phase 10)
